// FROZEN (orchestrator). SPEC §3 habit model (calibrated parameters) + remote predictor.
import { describe, it, expect, vi } from 'vitest'
import { HabitModel, HABIT_PARAMS } from '../../../src/engine/habit'
import { RemotePredictor, BG_WEIGHT } from '../../../src/engine/remote'
import { dealTurn } from '../../../src/engine/deck'
import { mulberry32 } from '../../../src/engine/rng'
import { getItem } from '../../../src/engine/catalog'
import { VIBES, type Context, type Turn } from '../../../src/contracts'

const ctx1: Context = { round: 1, tz: 'America/New_York', hour: 12, weekday: 0 }
const ctx2: Context = { ...ctx1, round: 2 }
const cards = dealTurn(mulberry32(1), new Set())

const softmax = (z: number[]) => {
  const m = Math.max(...z)
  const e = z.map((x) => Math.exp(x - m))
  const s = e.reduce((a, b) => a + b, 0)
  return e.map((x) => x / s)
}
const zscore = (s: number[]) => {
  const mu = s.reduce((a, b) => a + b, 0) / s.length
  const sd = Math.sqrt(s.reduce((a, b) => a + (b - mu) ** 2, 0) / s.length)
  return sd === 0 ? s.map(() => 0) : s.map((x) => (x - mu) / sd)
}
const ok = (scores: (number | null)[]) =>
  new Response(JSON.stringify({ scores, engine: 'behaviorgpt-v4', ms: 5 }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
type FetchArgs = [input: string | URL | Request, init?: RequestInit]

describe('habit model', () => {
  it('has the calibrated parameters', () => {
    expect(HABIT_PARAMS.lr).toEqual({ vibe: 1.0, price: 0.05, tone: 0.05, pos: 0.4, samePos: 0.4, sameVibe: 0.4, shown: 0.6, dist: 0.6 })
    expect(HABIT_PARAMS.l2).toBe(0.01)
    expect(HABIT_PARAMS.prior).toEqual({ topLeft: 0.2, shown: -2.5 })
  })

  it('a fresh model leans top-left and returns 4 probabilities summing to 1', async () => {
    const m = new HabitModel()
    expect(m.engine).toBe('habit-local')
    m.logits(cards).forEach((x, k) => expect(x).toBeCloseTo(k === 0 ? 0.2 : 0, 10))
    const p = await m.predict([], cards, ctx1)
    expect(p.probs).toHaveLength(4)
    expect(p.probs.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10)
    expect(p.top).toBe(cards[0])
    expect(p.defiance).toBeUndefined()
    expect(p.engine).toBe('habit-local')
  })

  it('round 2: the shown card is least likely and defiance is never the shown card', async () => {
    const m = new HabitModel()
    const p = await m.predict([], cards, ctx2, cards[0])
    expect(Math.min(...p.probs)).toBe(p.probs[0])
    expect(p.defiance).toBeDefined()
    expect(p.defiance).not.toBe(cards[0])
    expect(cards).toContain(p.defiance)
  })

  it('one observed pick moves vibe weights by exactly lr * (x - p)', () => {
    const m = new HabitModel()
    const turn: Turn = { round: 1, cards, sealed: cards[0], pick: cards[1], position: 1 }
    m.observe(turn)
    const w = m.vibeWeights()
    const e = Math.exp(0.2)
    const Z = e + 3
    const p0 = e / Z
    const p = 1 / Z
    const v = cards.map((id) => getItem(id).vibe)
    expect(w[v[1]]).toBeCloseTo(1.0 * (1 - p), 8)
    expect(w[v[0]]).toBeCloseTo(-p0, 8)
    expect(w[v[2]]).toBeCloseTo(-p, 8)
    expect(w[v[3]]).toBeCloseTo(-p, 8)
    for (const u of VIBES.filter((x) => !v.includes(x))) expect(w[u]).toBeCloseTo(0, 12)
  })

  it('after one pick it predicts the same card again on the same deal', async () => {
    const m = new HabitModel()
    m.observe({ round: 1, cards, sealed: cards[0], pick: cards[2], position: 2 })
    expect((await m.predict([], cards, ctx1)).top).toBe(cards[2])
  })
})

describe('remote predictor', () => {
  it('BG_WEIGHT is 1', () => {
    expect(BG_WEIGHT).toBe(1)
  })

  it('posts the frozen request and blends z-scored BehaviorGPT scores into the habit logits', async () => {
    const fetchImpl = vi.fn(async (..._a: FetchArgs) => ok([0.1, 0.9, 0.2, 0.3]))
    const habit = new HabitModel()
    const r = new RemotePredictor({ apiBase: 'https://api.example', habit, session: 'sess-1', fetchImpl: fetchImpl as unknown as typeof fetch })
    const p = await r.predict([], cards, ctx1)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const [url, init] = fetchImpl.mock.calls[0]
    expect(String(url)).toBe('https://api.example/api/rank')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual({ history: [], cards, tz: 'America/New_York', session: 'sess-1' })
    expect(p.engine).toBe('behaviorgpt-v4')
    expect(r.engine).toBe('behaviorgpt-v4')
    const z = zscore([0.1, 0.9, 0.2, 0.3])
    const expected = softmax(habit.logits(cards).map((x, k) => x + BG_WEIGHT * z[k]))
    p.probs.forEach((x, k) => expect(x).toBeCloseTo(expected[k], 6))
    expect(p.top).toBe(cards[1])
  })

  it('sends the picks so far as history and forwards observe to the habit model', async () => {
    const fetchImpl = vi.fn(async (..._a: FetchArgs) => ok([0.4, 0.3, 0.2, 0.1]))
    const habit = new HabitModel()
    const r = new RemotePredictor({ apiBase: 'https://api.example', habit, session: 's', fetchImpl: fetchImpl as unknown as typeof fetch })
    const t: Turn = { round: 1, cards, sealed: cards[0], pick: cards[3], position: 3 }
    r.observe(t)
    expect(habit.vibeWeights()[getItem(cards[3]).vibe]).toBeGreaterThan(0)
    const next = dealTurn(mulberry32(2), new Set(cards))
    await r.predict([t], next, ctx1)
    expect(JSON.parse(String(fetchImpl.mock.calls[0][1]?.body)).history).toEqual([cards[3]])
  })

  it('replaces a null score with the minimum before z-scoring', async () => {
    const fetchImpl = vi.fn(async (..._a: FetchArgs) => ok([null, 0.9, 0.2, 0.3]))
    const habit = new HabitModel()
    const r = new RemotePredictor({ apiBase: 'https://api.example', habit, session: 's', fetchImpl: fetchImpl as unknown as typeof fetch })
    const p = await r.predict([], cards, ctx1)
    const z = zscore([0.2, 0.9, 0.2, 0.3])
    const expected = softmax(habit.logits(cards).map((x, k) => x + z[k]))
    p.probs.forEach((x, k) => expect(x).toBeCloseTo(expected[k], 6))
    expect(p.engine).toBe('behaviorgpt-v4')
  })

  it('falls back to the habit model on a network error and stops calling the network', async () => {
    const fetchImpl = vi.fn(async (..._a: FetchArgs): Promise<Response> => {
      throw new TypeError('network down')
    })
    const habit = new HabitModel()
    const r = new RemotePredictor({ apiBase: 'https://api.example', habit, session: 's', fetchImpl: fetchImpl as unknown as typeof fetch })
    const p = await r.predict([], cards, ctx1)
    expect(p.engine).toBe('habit-local')
    expect(r.engine).toBe('habit-local')
    const expected = softmax(habit.logits(cards))
    p.probs.forEach((x, k) => expect(x).toBeCloseTo(expected[k], 8))
    await r.predict([], cards, ctx1)
    await r.predict([], cards, ctx2, cards[0])
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('falls back on a slow response', async () => {
    const fetchImpl = vi.fn(
      (..._a: FetchArgs) =>
        new Promise<Response>((resolve, reject) => {
          const timer = setTimeout(() => resolve(ok([0.1, 0.9, 0.2, 0.3])), 400)
          _a[1]?.signal?.addEventListener('abort', () => {
            clearTimeout(timer)
            reject(new DOMException('aborted', 'AbortError'))
          })
        }),
    )
    const r = new RemotePredictor({ apiBase: 'https://api.example', habit: new HabitModel(), session: 's', fetchImpl: fetchImpl as unknown as typeof fetch, timeoutMs: 30 })
    const t0 = Date.now()
    const p = await r.predict([], cards, ctx1)
    expect(p.engine).toBe('habit-local')
    expect(Date.now() - t0).toBeLessThan(300)
  })

  it('falls back on a non-200 answer and on all-null scores', async () => {
    const bad = vi.fn(async (..._a: FetchArgs) => new Response(JSON.stringify({ fallback: true }), { status: 502 }))
    const r1 = new RemotePredictor({ apiBase: 'https://api.example', habit: new HabitModel(), session: 's', fetchImpl: bad as unknown as typeof fetch })
    expect((await r1.predict([], cards, ctx1)).engine).toBe('habit-local')
    const nulls = vi.fn(async (..._a: FetchArgs) => ok([null, null, null, null]))
    const r2 = new RemotePredictor({ apiBase: 'https://api.example', habit: new HabitModel(), session: 's', fetchImpl: nulls as unknown as typeof fetch })
    expect((await r2.predict([], cards, ctx1)).engine).toBe('habit-local')
  })

  it('round 2 defiance is never the shown card', async () => {
    const fetchImpl = vi.fn(async (..._a: FetchArgs) => ok([0.9, 0.1, 0.2, 0.3]))
    const r = new RemotePredictor({ apiBase: 'https://api.example', habit: new HabitModel(), session: 's', fetchImpl: fetchImpl as unknown as typeof fetch })
    const p = await r.predict([], cards, ctx2, cards[0])
    expect(p.defiance).toBeDefined()
    expect(p.defiance).not.toBe(cards[0])
    expect(cards).toContain(p.defiance)
  })
})
