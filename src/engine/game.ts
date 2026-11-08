// The 12-turn game. The UI drives it only through this class.
// A TurnView never carries the sealed id, so the UI cannot leak what it never receives.
import {
  TURNS_PER_ROUND,
  type GameOptions,
  type Prediction,
  type Reveal,
  type RevealStatus,
  type RunResult,
  type Seal,
  type Turn,
  type TurnView,
} from '../contracts'
import type { TurnOdds } from './boldest'
import { getItem } from './catalog'
import { dealTurn } from './deck'
import { mulberry32 } from './rng'
import { scoreRun } from './score'
import { seal } from './seal'

const TOTAL_TURNS = TURNS_PER_ROUND * 2

interface Pending {
  round: 1 | 2
  cards: string[]
  shown?: string
  sealed: string
  seal: Seal
  /** the sealing prediction's probabilities and engine, kept private until the tap */
  probs: number[]
  engine: Prediction['engine']
}

/** The most likely card among `allowed`, by the prediction's probabilities (ties go to the lower position). */
function bestAmong(p: Prediction, cards: string[], allowed: (id: string) => boolean): string {
  let best = -1
  for (let i = 0; i < cards.length; i++) {
    if (!allowed(cards[i])) continue
    if (best < 0 || p.probs[i] > p.probs[best]) best = i
  }
  return cards[best]
}

export class Game {
  readonly turns: Turn[] = []
  readonly seals: Seal[] = []
  /** per picked turn: the odds the sealing prediction gave the card that was picked (parallel to `turns`) */
  readonly odds: TurnOdds[] = []
  private readonly rng: () => number
  private readonly used = new Set<string>()
  private pending: Pending | null = null
  private dealing = false

  constructor(private readonly o: GameOptions) {
    this.rng = mulberry32(o.seed)
  }

  async next(): Promise<TurnView | null> {
    if (this.dealing) throw new Error('next() is already running')
    if (this.pending) throw new Error('the current turn has not been picked')
    if (this.turns.length >= TOTAL_TURNS) return null
    this.dealing = true
    try {
      const round: 1 | 2 = this.turns.length < TURNS_PER_ROUND ? 1 : 2
      const index = this.turns.length % TURNS_PER_ROUND
      const cards = dealTurn(this.rng, this.used)
      const ctx = { ...this.o.ctx, round }
      const history = [...this.turns]
      const predictor = this.o.predictor

      let shown: string | undefined
      let sealed: string
      let sealedBy: Prediction
      if (round === 1) {
        const p = await predictor.predict(history, cards, ctx)
        sealed = cards.includes(p.top) ? p.top : cards[0]
        sealedBy = p
      } else {
        const p0 = await predictor.predict(history, cards, ctx)
        shown = cards.includes(p0.top) ? p0.top : cards[0]
        const shownId = shown
        const p = await predictor.predict(history, cards, ctx, shownId)
        const d = p.defiance
        sealed = d !== undefined && cards.includes(d) && d !== shownId ? d : bestAmong(p, cards, (id) => id !== shownId)
        sealedBy = p
      }

      const s = await seal(sealed)
      this.pending = {
        round,
        cards,
        ...(shown !== undefined ? { shown } : {}),
        sealed,
        seal: s,
        probs: Array.isArray(sealedBy.probs) ? sealedBy.probs.slice() : [],
        engine: sealedBy.engine,
      }
      return {
        round,
        index,
        cards: cards.map(getItem),
        ...(shown !== undefined ? { shown } : {}),
        commitment: s.commitment,
      }
    } finally {
      this.dealing = false
    }
  }

  async pick(id: string): Promise<Reveal> {
    const cur = this.pending
    if (!cur) throw new Error('no turn is waiting for a pick')
    const position = cur.cards.indexOf(id)
    if (position < 0) throw new Error('that card is not on the table')

    const turn: Turn = {
      round: cur.round,
      cards: cur.cards,
      ...(cur.shown !== undefined ? { shown: cur.shown } : {}),
      sealed: cur.sealed,
      pick: id,
      position: position as Turn['position'],
    }
    this.pending = null
    this.turns.push(turn)
    this.seals.push(cur.seal)
    this.odds.push({ odds: cur.probs[position] ?? Number.NaN, engine: cur.engine })
    this.o.predictor.observe(turn)

    let status: RevealStatus
    if (cur.round === 1) status = cur.sealed === id ? 'called' : 'missed'
    else if (id === cur.shown) status = 'obeyed'
    else status = cur.sealed === id ? 'calledDefy' : 'escaped'
    return { status, turn, seal: cur.seal }
  }

  result(runId: string): RunResult {
    return scoreRun(this.turns, this.o.predictor.engine, runId)
  }
}
