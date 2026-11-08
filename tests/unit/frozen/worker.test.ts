// FROZEN (orchestrator). SPEC §4 backend contract + Worker interface, acceptance A5.
import { describe, it, expect, vi, afterEach } from 'vitest'
import worker, { type Env } from '../../../worker/src/index'
import catalog from '../../../src/data/catalog.json'

const IDS = (catalog as { id: string }[]).map((i) => i.id)
const UP = 'https://behaviorgpt-northeurope.api.unboxai.com/v1/vector/recommendations'
const ORIGIN = 'https://wilsonwu-ai.github.io'
const SESSION = '6f1c2c1e-3b1a-4c55-9a43-2f0d5e8b9a10'

function makeKV() {
  const m = new Map<string, string>()
  const puts: { key: string; ttl?: number }[] = []
  return {
    m,
    puts,
    get: async (k: string) => m.get(k) ?? null,
    put: async (k: string, v: string, o?: { expirationTtl?: number }) => {
      puts.push({ key: k, ttl: o?.expirationTtl })
      m.set(k, v)
    },
  }
}

function makeEnv(over: Partial<Env> = {}) {
  const kv = makeKV()
  const env = {
    UNBOXAI_API_KEY: 'test-key',
    UNBOX_CATALOG_ID: 'cat-123',
    ALLOWED_ORIGIN: ORIGIN,
    DEFY_KV: kv,
    UPSTREAM_TIMEOUT_MS: '100',
    ...over,
  } as Env
  return { env, kv }
}

type Init = RequestInit & { origin?: string | null; ip?: string }
function req(path: string, init: Init = {}) {
  const h = new Headers(init.headers)
  if (init.origin !== null) h.set('Origin', init.origin ?? ORIGIN)
  h.set('CF-Connecting-IP', init.ip ?? '203.0.113.7')
  return new Request('https://defy-api.example.workers.dev' + path, { method: init.method, body: init.body, headers: h })
}
const rankBody = (history: string[], cards: string[]) =>
  JSON.stringify({ history, cards, tz: 'America/New_York', session: SESSION })
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

async function captured(call: unknown[]) {
  const [u, i] = call as [RequestInfo | URL, RequestInit | undefined]
  if (u instanceof Request) return { url: u.url, headers: u.headers, body: await u.text() }
  return { url: String(u), headers: new Headers(i?.headers), body: String(i?.body) }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('POST /api/rank', () => {
  it('sends the frozen upstream body with only the key header, and maps scores to cards (null when missing)', async () => {
    const cards = IDS.slice(0, 4)
    const history = IDS.slice(10, 13)
    const up = vi.fn(async (..._a: unknown[]) =>
      json({ items: [{ id: cards[2], score: 0.7, data: {} }, { id: cards[0], score: 0.4, data: {} }, { id: 'zzz', score: 0.9, data: {} }], offset: 0, limit: 100 }),
    )
    vi.stubGlobal('fetch', up)
    const { env } = makeEnv()
    const res = await worker.fetch(
      req('/api/rank', { method: 'POST', body: rankBody(history, cards), headers: { 'content-type': 'application/json', cookie: 'sid=secret', 'user-agent': 'client-agent/1.0' } }),
      env,
    )
    expect(res.status).toBe(200)
    const out = (await res.json()) as { scores: (number | null)[]; engine: string; ms: number }
    expect(out.scores).toEqual([0.4, null, 0.7, null])
    expect(out.engine).toBe('behaviorgpt-v4')
    expect(typeof out.ms).toBe('number')
    expect(res.headers.get('access-control-allow-origin')).toBe(ORIGIN)

    expect(up).toHaveBeenCalledTimes(1)
    const c = await captured(up.mock.calls[0])
    expect(c.url).toBe(UP)
    expect(c.headers.get('x-api-key')).toBe('test-key')
    for (const k of ['cookie', 'user-agent', 'cf-connecting-ip', 'origin']) expect(c.headers.get(k)).toBeNull()
    const body = JSON.parse(c.body)
    expect(body.store_id).toBe('cat-123')
    expect(body.register_event).toBe(false)
    expect(body.limit).toBe(100)
    expect(body.offset).toBe(0)
    expect(body.filters).toEqual({})
    expect(body.timezone).toBe('America/New_York')
    expect(body.domains).toEqual({ market: 'us', postal_code: 'unk', gender: 'unk', age_group: 'unk' })
    expect(body.history.map((e: { event: unknown }) => e.event)).toEqual(history.map((p) => ({ type: 'viewItem', product: p })))
    for (const e of body.history) {
      expect(e.store_id).toBe('cat-123')
      expect(e.session_id).toBe(SESSION)
      expect(e.timezone).toBe('America/New_York')
      expect(e.domains).toEqual(body.domains)
    }
    const ts = body.history.map((e: { timestamp: string }) => Date.parse(e.timestamp))
    for (let k = 1; k < ts.length; k++) expect(ts[k] - ts[k - 1]).toBe(1000)
  })

  it('allows an empty history', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ items: [], offset: 0, limit: 100 })))
    const { env } = makeEnv()
    const res = await worker.fetch(req('/api/rank', { method: 'POST', body: rankBody([], IDS.slice(4, 8)), headers: { 'content-type': 'application/json' } }), env)
    expect(res.status).toBe(200)
    expect(((await res.json()) as { scores: unknown[] }).scores).toEqual([null, null, null, null])
  })

  it('rejects unknown ids and bad shapes with 400', async () => {
    const up = vi.fn(async () => json({ items: [], offset: 0, limit: 100 }))
    vi.stubGlobal('fetch', up)
    const { env } = makeEnv()
    const bad = [
      rankBody([], ['not-a-real-item', ...IDS.slice(1, 4)]),
      rankBody(['nope'], IDS.slice(0, 4)),
      rankBody([], IDS.slice(0, 3)),
      rankBody(IDS.slice(0, 25), IDS.slice(30, 34)),
      JSON.stringify({ cards: IDS.slice(0, 4) }),
      'not json',
    ]
    for (const b of bad) {
      const res = await worker.fetch(req('/api/rank', { method: 'POST', body: b, headers: { 'content-type': 'application/json' } }), env)
      expect(res.status, b).toBe(400)
    }
    expect(up).not.toHaveBeenCalled()
  })

  it('returns 502 {fallback:true} on an upstream error or timeout', async () => {
    const { env } = makeEnv({ UPSTREAM_TIMEOUT_MS: '50' })
    vi.stubGlobal('fetch', vi.fn(async () => new Response('boom', { status: 500 })))
    let res = await worker.fetch(req('/api/rank', { method: 'POST', body: rankBody([], IDS.slice(0, 4)), headers: { 'content-type': 'application/json' } }), env)
    expect(res.status).toBe(502)
    expect(await res.json()).toEqual({ fallback: true })

    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_u: unknown, init?: RequestInit) =>
          new Promise<Response>((resolve, reject) => {
            const t = setTimeout(() => resolve(json({ items: [], offset: 0, limit: 100 })), 1000)
            init?.signal?.addEventListener('abort', () => {
              clearTimeout(t)
              reject(new DOMException('aborted', 'AbortError'))
            })
          }),
      ),
    )
    const t0 = Date.now()
    res = await worker.fetch(req('/api/rank', { method: 'POST', body: rankBody([], IDS.slice(0, 4)), headers: { 'content-type': 'application/json' } }), env)
    expect(res.status).toBe(502)
    expect(await res.json()).toEqual({ fallback: true })
    expect(Date.now() - t0).toBeLessThan(800)
  })

  it('returns 503 {fallback:true} without calling upstream when no key is configured', async () => {
    const up = vi.fn(async () => json({ items: [], offset: 0, limit: 100 }))
    vi.stubGlobal('fetch', up)
    const { env } = makeEnv({ UNBOXAI_API_KEY: undefined })
    const res = await worker.fetch(req('/api/rank', { method: 'POST', body: rankBody([], IDS.slice(0, 4)), headers: { 'content-type': 'application/json' } }), env)
    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({ fallback: true })
    expect(up).not.toHaveBeenCalled()
  })

  it('limits one IP to 60 rank calls a minute, in memory only', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ items: [], offset: 0, limit: 100 })))
    const { env, kv } = makeEnv()
    const statuses: number[] = []
    for (let k = 0; k < 61; k++) {
      const res = await worker.fetch(req('/api/rank', { method: 'POST', ip: '198.51.100.99', body: rankBody([], IDS.slice(0, 4)), headers: { 'content-type': 'application/json' } }), env)
      statuses.push(res.status)
    }
    expect(statuses.slice(0, 60).every((s) => s === 200)).toBe(true)
    expect(statuses[60]).toBe(429)
    for (const v of kv.m.values()) expect(v).not.toContain('198.51.100.99')
  })
})

const RUN = (o: Record<string, unknown> = {}) =>
  JSON.stringify({ runId: '0b7e1f5c-1d2a-4c3b-8e9f-112233445566', called1: 2, defied: 4, calledDefy: 1, obeyed: 2, engine: 'habit-local', ...o })

describe('POST /api/result and GET /api/stats', () => {
  it('validates bounds', async () => {
    const { env } = makeEnv()
    const bad = [
      RUN({ called1: 7 }),
      RUN({ calledDefy: 5 }),
      RUN({ obeyed: 3 }),
      RUN({ defied: 7, obeyed: -1 }),
      RUN({ called1: 1.5 }),
      RUN({ engine: 'gpt' }),
      RUN({ runId: 'x' }),
      RUN({ runId: undefined }),
      'not json',
    ]
    for (const b of bad) {
      const res = await worker.fetch(req('/api/result', { method: 'POST', body: b, headers: { 'content-type': 'application/json' } }), env)
      expect(res.status, b).toBe(400)
    }
  })

  it('records a result once per runId, with a 7-day key, and stats reflect it', async () => {
    const { env, kv } = makeEnv()
    let res = await worker.fetch(req('/api/stats', { method: 'GET' }), env)
    expect(res.status).toBe(200)
    let stats = (await res.json()) as { n: number; histogram: number[]; mean: number }
    expect(stats.n).toBe(0)
    expect(stats.histogram).toHaveLength(11)
    expect(res.headers.get('cache-control') ?? '').toContain('max-age=30')

    for (let k = 0; k < 2; k++) {
      res = await worker.fetch(req('/api/result', { method: 'POST', body: RUN(), headers: { 'content-type': 'application/json' } }), env)
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ ok: true })
    }
    expect(kv.puts.some((p) => p.key === 'run:0b7e1f5c-1d2a-4c3b-8e9f-112233445566' && p.ttl === 604800)).toBe(true)

    res = await worker.fetch(req('/api/stats', { method: 'GET' }), env)
    stats = (await res.json()) as { n: number; histogram: number[]; mean: number }
    expect(stats.n).toBe(1)
    expect(stats.histogram[3]).toBe(1) // predictability 30% -> bin 3
    expect(stats.histogram.reduce((a, b) => a + b, 0)).toBe(1)
    expect(stats.mean).toBeCloseTo(30, 6)
  })
})

describe('CORS and routing', () => {
  it('answers preflight for allowed origins, including localhost', async () => {
    const { env } = makeEnv()
    for (const origin of [ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:4173']) {
      const res = await worker.fetch(req('/api/rank', { method: 'OPTIONS', origin }), env)
      expect(res.status).toBe(204)
      expect(res.headers.get('access-control-allow-origin')).toBe(origin)
      expect(res.headers.get('access-control-allow-methods') ?? '').toContain('POST')
      expect((res.headers.get('access-control-allow-headers') ?? '').toLowerCase()).toContain('content-type')
    }
  })

  it('refuses other origins on every method', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ items: [], offset: 0, limit: 100 })))
    const { env } = makeEnv()
    for (const [method, path, body] of [
      ['OPTIONS', '/api/rank', undefined],
      ['POST', '/api/rank', rankBody([], IDS.slice(0, 4))],
      ['GET', '/api/stats', undefined],
      ['POST', '/api/result', RUN()],
    ] as const) {
      const res = await worker.fetch(req(path, { method, body, origin: 'https://evil.example', headers: { 'content-type': 'application/json' } }), env)
      expect(res.status, `${method} ${path}`).toBe(403)
      expect(res.headers.get('access-control-allow-origin')).toBeNull()
    }
  })

  it('serves requests without an Origin header and 404s unknown routes', async () => {
    const { env } = makeEnv()
    const res = await worker.fetch(req('/api/stats', { method: 'GET', origin: null }), env)
    expect(res.status).toBe(200)
    expect(res.headers.get('access-control-allow-origin')).toBeNull()
    expect((await worker.fetch(req('/api/nope', { method: 'GET' }), env)).status).toBe(404)
  })

  it('never writes an IP address to KV', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ items: [], offset: 0, limit: 100 })))
    const { env, kv } = makeEnv()
    await worker.fetch(req('/api/rank', { method: 'POST', ip: '192.0.2.44', body: rankBody([], IDS.slice(0, 4)), headers: { 'content-type': 'application/json' } }), env)
    await worker.fetch(req('/api/result', { method: 'POST', ip: '192.0.2.44', body: RUN({ runId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' }), headers: { 'content-type': 'application/json' } }), env)
    expect(kv.m.size).toBeGreaterThan(0)
    for (const [k, v] of kv.m) {
      expect(k).not.toContain('192.0.2.44')
      expect(v).not.toContain('192.0.2.44')
    }
  })
})
