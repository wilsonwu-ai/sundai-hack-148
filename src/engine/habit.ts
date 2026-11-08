// Local habit model: an online multinomial logit over the 4 cards on the table.
// Calibrated parameters are frozen (SPEC section 3, research/calibration.md).
import { VIBES, VIBE_RING, type Context, type Prediction, type Predictor, type Tone, type Turn, type Vibe } from '../contracts'
import type { Item } from '../contracts'
import { getItem } from './catalog'

export const HABIT_PARAMS = {
  lr: { vibe: 1.0, price: 0.05, tone: 0.05, pos: 0.4, samePos: 0.4, sameVibe: 0.4, shown: 0.6, dist: 0.6 },
  l2: 0.01,
  prior: { topLeft: 0.2, shown: -2.5 },
} as const

const TONES: readonly Tone[] = ['warm', 'cool', 'neutral']

// Feature layout: vibe one-hot 0-5, price 6, tone one-hot 7-9, position one-hot 10-13,
// same position as last pick 14, same vibe as last pick 15, is-shown 16, vibe distance 17.
const F_PRICE = 6
const F_TONE = 7
const F_POS = 10
const F_SAME_POS = 14
const F_SAME_VIBE = 15
const F_SHOWN = 16
const F_DIST = 17
const NF = 18

const LR: number[] = [
  ...Array<number>(6).fill(HABIT_PARAMS.lr.vibe),
  HABIT_PARAMS.lr.price,
  ...Array<number>(3).fill(HABIT_PARAMS.lr.tone),
  ...Array<number>(4).fill(HABIT_PARAMS.lr.pos),
  HABIT_PARAMS.lr.samePos,
  HABIT_PARAMS.lr.sameVibe,
  HABIT_PARAMS.lr.shown,
  HABIT_PARAMS.lr.dist,
]

function ringDistance(a: Vibe, b: Vibe): number {
  const d = Math.abs(VIBE_RING.indexOf(a) - VIBE_RING.indexOf(b))
  return Math.min(d, VIBE_RING.length - d) / 3
}

function softmax(z: number[]): number[] {
  const m = Math.max(...z)
  const e = z.map((x) => Math.exp(x - m))
  const s = e.reduce((a, b) => a + b, 0)
  return e.map((x) => x / s)
}

interface Last {
  pos: number
  vibe: Vibe
}

export class HabitModel implements Predictor {
  readonly engine = 'habit-local' as const
  private w: number[] = new Array<number>(NF).fill(0)
  private last: Last | null = null

  constructor() {
    this.w[F_POS] = HABIT_PARAMS.prior.topLeft
    this.w[F_SHOWN] = HABIT_PARAMS.prior.shown
  }

  private features(item: Item, pos: number, shownItem: Item | null): number[] {
    const x = new Array<number>(NF).fill(0)
    x[VIBES.indexOf(item.vibe)] = 1
    x[F_PRICE] = (item.price - 2.5) / 1.5
    x[F_TONE + TONES.indexOf(item.tone)] = 1
    x[F_POS + pos] = 1
    if (this.last) {
      x[F_SAME_POS] = pos === this.last.pos ? 1 : 0
      x[F_SAME_VIBE] = item.vibe === this.last.vibe ? 1 : 0
    }
    if (shownItem) {
      x[F_SHOWN] = item.id === shownItem.id ? 1 : 0
      x[F_DIST] = ringDistance(item.vibe, shownItem.vibe)
    }
    return x
  }

  private forward(cards: string[], shown?: string): { X: number[][]; z: number[] } {
    const shownItem = shown !== undefined ? getItem(shown) : null
    const X = cards.map((id, pos) => this.features(getItem(id), pos, shownItem))
    const z = X.map((x) => x.reduce((s, xi, i) => s + xi * this.w[i], 0))
    return { X, z }
  }

  /** Raw scores in card order, before the softmax. */
  logits(cards: string[], shown?: string): number[] {
    return this.forward(cards, shown).z
  }

  vibeWeights(): Record<Vibe, number> {
    const out = {} as Record<Vibe, number>
    VIBES.forEach((v, i) => {
      out[v] = this.w[i]
    })
    return out
  }

  async predict(_history: Turn[], cards: string[], _ctx: Context, shown?: string): Promise<Prediction> {
    const probs = softmax(this.logits(cards, shown))
    let top = 0
    for (let i = 1; i < probs.length; i++) if (probs[i] > probs[top]) top = i
    const out: Prediction = { probs, top: cards[top], engine: 'habit-local' }
    if (shown !== undefined) {
      let best = -1
      for (let i = 0; i < cards.length; i++) {
        if (cards[i] === shown) continue
        if (best < 0 || probs[i] > probs[best]) best = i
      }
      if (best >= 0) out.defiance = cards[best]
    }
    return out
  }

  observe(turn: Turn): void {
    const k = turn.cards.indexOf(turn.pick)
    if (k < 0) return
    const { X, z } = this.forward(turn.cards, turn.shown)
    const p = softmax(z)
    for (let i = 0; i < NF; i++) {
      let g = X[k][i]
      for (let j = 0; j < X.length; j++) g -= p[j] * X[j][i]
      this.w[i] += LR[i] * g - LR[i] * HABIT_PARAMS.l2 * this.w[i]
    }
    this.last = { pos: k, vibe: getItem(turn.pick).vibe }
  }
}
