import { describe, expect, it } from 'vitest'
import type { Context, Prediction, Predictor, Turn } from '../../../src/contracts'
import { boldestMove, oddsPhrase, type TurnOdds } from '../../../src/engine/boldest'
import { Game } from '../../../src/engine/game'

const PROBS = [0.1, 0.2, 0.3, 0.4]

/** Always the same odds in card order; the top card is position 3, and round 2's defiance guess is position 2. */
class FixedPredictor implements Predictor {
  readonly engine = 'habit-local' as const
  async predict(_h: Turn[], cards: string[], _c: Context, shown?: string): Promise<Prediction> {
    const out: Prediction = { probs: PROBS.slice(), top: cards[3], engine: 'habit-local' }
    if (shown !== undefined) out.defiance = cards[2] !== shown ? cards[2] : cards[1]
    return out
  }
  observe(): void {}
}

const turn = (pick: string): Turn => ({ round: 1, cards: ['a', 'b', 'c', 'd'], sealed: 'd', pick, position: 0 })
const odds = (...xs: number[]): TurnOdds[] => xs.map((x) => ({ odds: x, engine: 'habit-local' }))

describe('Game records the odds of each pick', () => {
  it('keeps the sealing prediction’s odds for the picked card, only after the tap', async () => {
    const g = new Game({ seed: 7, predictor: new FixedPredictor(), ctx: { tz: 'UTC', hour: 12, weekday: 0 } })
    for (let t = 0; t < 12; t++) {
      const v = await g.next()
      expect(v).not.toBeNull()
      expect(g.odds).toHaveLength(t) // nothing is recorded for the turn still waiting for its tap
      const position = t === 4 ? 0 : 3
      await g.pick(v!.cards[position].id)
    }
    expect(await g.next()).toBeNull()
    expect(g.odds).toHaveLength(12)
    expect(g.odds.map((o) => o.odds)).toEqual(Array.from({ length: 12 }, (_, i) => (i === 4 ? 0.1 : 0.4)))
    expect(g.odds.every((o) => o.engine === 'habit-local')).toBe(true)

    const b = boldestMove(g.turns, g.odds)
    expect(b?.index).toBe(4)
    expect(b?.odds).toBe(0.1)
    expect(b?.turn.pick).toBe(g.turns[4].pick)
  })
})

describe('boldestMove', () => {
  it('picks the lowest odds and breaks ties toward the earlier turn', () => {
    expect(boldestMove([turn('a'), turn('b'), turn('c')], odds(0.2, 0.1, 0.1))?.index).toBe(1)
  })
  it('skips odds that are not valid probabilities', () => {
    expect(boldestMove([turn('a'), turn('b'), turn('c')], odds(Number.NaN, -0.1, 0.5))?.index).toBe(2)
  })
  it('returns null with nothing to judge', () => {
    expect(boldestMove([], [])).toBeNull()
    expect(boldestMove([turn('a')], odds(Number.NaN))).toBeNull()
  })
})

describe('oddsPhrase', () => {
  it('rounds to a whole percent with the right article', () => {
    expect(oddsPhrase(0.07)).toBe('a 7% chance')
    expect(oddsPhrase(0.08)).toBe('an 8% chance')
    expect(oddsPhrase(0.11)).toBe('an 11% chance')
    expect(oddsPhrase(0.18)).toBe('an 18% chance')
    expect(oddsPhrase(0.5)).toBe('a 50% chance')
    expect(oddsPhrase(0.83)).toBe('an 83% chance')
  })
  it('never prints 0%', () => {
    expect(oddsPhrase(0.004)).toBe('less than a 1% chance')
  })
})
