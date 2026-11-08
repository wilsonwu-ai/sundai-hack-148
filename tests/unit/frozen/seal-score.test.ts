// FROZEN (orchestrator). SPEC §3 seal + score formulas, acceptance A3.
import { describe, it, expect } from 'vitest'
import { createHash } from 'node:crypto'
import { seal, verify, short } from '../../../src/engine/seal'
import { scoreRun, predictability, chance, percentile } from '../../../src/engine/score'
import type { RunResult, Stats, Turn } from '../../../src/contracts'

describe('seal', () => {
  it('commits with sha-256 of `${id}:${salt}` and a 16-byte salt', async () => {
    const s = await seal('lavender-candle')
    expect(s.salt).toMatch(/^[0-9a-f]{32}$/)
    expect(s.commitment).toMatch(/^[0-9a-f]{64}$/)
    expect(s.commitment).toBe(createHash('sha256').update(`lavender-candle:${s.salt}`).digest('hex'))
  })

  it('verifies only the sealed id with the original salt', async () => {
    const s = await seal('trail-boots')
    expect(await verify('trail-boots', s)).toBe(true)
    for (const other of ['trail-boot', 'lavender-candle', '', 'TRAIL-BOOTS']) expect(await verify(other, s)).toBe(false)
    const flipped = s.salt.slice(0, -1) + (s.salt.endsWith('0') ? '1' : '0')
    expect(await verify('trail-boots', { ...s, salt: flipped })).toBe(false)
  })

  it('uses a fresh salt every time', async () => {
    const a = await seal('x-item')
    const b = await seal('x-item')
    expect(a.salt).not.toBe(b.salt)
    expect(a.commitment).not.toBe(b.commitment)
  })

  it('short() is the first 8 hex characters', () => {
    expect(short('3f9a01c2deadbeef00')).toBe('3f9a01c2')
  })
})

const CARDS = ['a', 'b', 'c', 'd']
const T = (round: 1 | 2, sealed: string, pick: string, shown?: string): Turn => ({
  round,
  cards: CARDS,
  shown,
  sealed,
  pick,
  position: CARDS.indexOf(pick) as Turn['position'],
})

describe('score', () => {
  const turns: Turn[] = [
    T(1, 'a', 'a'), T(1, 'b', 'b'), T(1, 'a', 'c'), T(1, 'd', 'a'), T(1, 'c', 'b'), T(1, 'b', 'd'),
    T(2, 'b', 'a', 'a'), T(2, 'b', 'a', 'a'), // obeyed twice
    T(2, 'c', 'c', 'a'), // defied, called
    T(2, 'c', 'd', 'a'), T(2, 'b', 'c', 'a'), T(2, 'd', 'b', 'a'), // defied, escaped
  ]

  it('counts called, defied, calledDefy and obeyed', () => {
    expect(scoreRun(turns, 'habit-local', 'run-1')).toEqual({
      runId: 'run-1', called1: 2, defied: 4, calledDefy: 1, obeyed: 2, engine: 'habit-local',
    })
  })

  it('predictability = round(100 * (called1 + calledDefy) / (6 + defied))', () => {
    expect(predictability(scoreRun(turns, 'habit-local', 'r'))).toBe(30)
    const never: RunResult = { runId: 'n', called1: 4, defied: 0, calledDefy: 0, obeyed: 6, engine: 'habit-local' }
    expect(predictability(never)).toBe(67)
  })

  it('chance baselines are 1.5 and defied / 3', () => {
    const c = chance(scoreRun(turns, 'habit-local', 'r'))
    expect(c.called1).toBe(1.5)
    expect(c.calledDefy).toBeCloseTo(4 / 3, 10)
  })

  it('percentile is null below 20 players and uses half of your own bin', () => {
    const small: Stats = { n: 19, histogram: [0, 0, 19, 0, 0, 0, 0, 0, 0, 0, 0], mean: 20 }
    expect(percentile(50, null)).toBeNull()
    expect(percentile(50, small)).toBeNull()
    const big: Stats = { n: 100, histogram: [10, 20, 20, 10, 10, 10, 5, 5, 5, 3, 2], mean: 35 }
    expect(percentile(30, big)).toBe(55)
    expect(percentile(0, big)).toBe(5)
    expect(percentile(100, big)).toBe(99)
  })
})
