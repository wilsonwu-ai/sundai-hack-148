// FROZEN (orchestrator). SPEC §3 Game contract + frozen call order.
import { describe, it, expect } from 'vitest'
import { Game } from '../../../src/engine/game'
import { verify } from '../../../src/engine/seal'
import { mulberry32 } from '../../../src/engine/rng'
import { dealTurn } from '../../../src/engine/deck'
import type { Context, Prediction, Predictor, Turn } from '../../../src/contracts'

// A predictor with fixed answers: top = 3rd card; defiance = 3rd non-shown card.
class Spy implements Predictor {
  readonly engine = 'habit-local' as const
  log: string[] = []
  histories: number[] = []
  async predict(history: Turn[], cards: string[], ctx: Context, shown?: string): Promise<Prediction> {
    this.log.push(shown === undefined ? `predict:${ctx.round}` : `predict:${ctx.round}:shown`)
    this.histories.push(history.length)
    const defiance = shown === undefined ? undefined : cards.filter((c) => c !== shown)[2]
    return { probs: [0.1, 0.2, 0.6, 0.1], top: cards[2], defiance, engine: this.engine }
  }
  observe(turn: Turn): void {
    this.log.push(`observe:${turn.round}`)
  }
}
const ctx = { tz: 'UTC', hour: 12, weekday: 0 }
const VIEW_KEYS = ['round', 'index', 'cards', 'shown', 'commitment']

describe('Game', () => {
  it('follows the frozen call order, seals before the tap and reports honest statuses', async () => {
    const spy = new Spy()
    const g = new Game({ seed: 11, predictor: spy, ctx })
    for (let t = 0; t < 12; t++) {
      const v = await g.next()
      if (!v) throw new Error(`game ended early at turn ${t}`)
      expect(Object.keys(v).every((k) => VIEW_KEYS.includes(k))).toBe(true)
      expect(v.round).toBe(t < 6 ? 1 : 2)
      expect(v.index).toBe(t % 6)
      expect(v.cards).toHaveLength(4)
      expect(v.commitment).toMatch(/^[0-9a-f]{64}$/)
      const ids = v.cards.map((c) => c.id)
      if (v.round === 1) expect(v.shown).toBeUndefined()
      else expect(v.shown).toBe(ids[2])

      const pickId = ids[t % 4]
      const r = await g.pick(pickId)
      const sealed = v.round === 1 ? ids[2] : ids.filter((c) => c !== ids[2])[2]
      expect(r.turn).toEqual({ round: v.round, cards: ids, ...(v.round === 2 ? { shown: ids[2] } : {}), sealed, pick: pickId, position: t % 4 })
      expect(r.seal.commitment).toBe(v.commitment)
      expect(await verify(sealed, r.seal)).toBe(true)
      const status =
        v.round === 1
          ? pickId === sealed ? 'called' : 'missed'
          : pickId === ids[2] ? 'obeyed' : pickId === sealed ? 'calledDefy' : 'escaped'
      expect(r.status).toBe(status)
    }
    expect(await g.next()).toBeNull()
    expect(spy.log).toEqual([
      ...Array.from({ length: 6 }, () => ['predict:1', 'observe:1']).flat(),
      ...Array.from({ length: 6 }, () => ['predict:2', 'predict:2:shown', 'observe:2']).flat(),
    ])
    expect(spy.histories).toEqual([0, 1, 2, 3, 4, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11])
    expect(g.turns).toHaveLength(12)
    expect(g.seals).toHaveLength(12)
    expect(g.result('run-x')).toEqual({ runId: 'run-x', called1: 1, defied: 4, calledDefy: 2, obeyed: 2, engine: 'habit-local' })
  })

  it('guards the turn protocol', async () => {
    const g = new Game({ seed: 3, predictor: new Spy(), ctx })
    await expect(g.pick('anything')).rejects.toThrow()
    const v = await g.next()
    if (!v) throw new Error('no turn')
    await expect(g.next()).rejects.toThrow()
    await expect(g.pick('not-on-the-table')).rejects.toThrow()
    await g.pick(v.cards[0].id)
    await expect(g.pick(v.cards[1].id)).rejects.toThrow()
    expect(await g.next()).not.toBeNull()
  })

  it('deals from a dedicated mulberry32(seed) stream, exactly like dealTurn', async () => {
    const g = new Game({ seed: 5, predictor: new Spy(), ctx })
    const r = mulberry32(5)
    const used = new Set<string>()
    for (let t = 0; t < 12; t++) {
      const v = await g.next()
      if (!v) throw new Error('ended early')
      expect(v.cards.map((c) => c.id)).toEqual(dealTurn(r, used))
      await g.pick(v.cards[(t * 3) % 4].id)
    }
  })
})
