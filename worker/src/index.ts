// DEFY backend (SPEC.md section 4). One small Cloudflare Worker:
//   POST /api/rank    proxies BehaviorGPT so the API key never reaches the browser
//   POST /api/result  records one finished run in an anonymous histogram
//   GET  /api/stats   returns the histogram
// KV holds only the histogram (`stats`) and run ids (`run:<id>`). No IP address is ever stored.

import catalog from '../../src/data/catalog.json'

export type KVLike = {
  get(key: string): Promise<string | null>
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>
}

export interface Env {
  UNBOXAI_API_KEY?: string
  UNBOX_CATALOG_ID: string
  ALLOWED_ORIGIN: string
  DEFY_KV: KVLike
  UPSTREAM_TIMEOUT_MS?: string
}

const UPSTREAM_URL = 'https://behaviorgpt-northeurope.api.unboxai.com/v1/vector/recommendations'
const DEFAULT_TIMEOUT_MS = 1500
const RUN_TTL_SECONDS = 604800
const RATE_LIMIT = 60
const RATE_WINDOW_MS = 60_000
const MAX_BODY_CHARS = 8192
const RUN_ID = /^[A-Za-z0-9-]{8,64}$/
const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1):\d{1,5}$/
const ENGINES: readonly string[] = ['behaviorgpt-v4', 'habit-local']

const IDS: ReadonlySet<string> = new Set((catalog as { id: string }[]).map((i) => i.id))

type Stats = { n: number; histogram: number[]; mean: number }
type Headers_ = Record<string, string>

// ---- small helpers ----

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function reply(status: number, body: unknown, extra: Headers_ = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...extra },
  })
}

function isAllowedOrigin(origin: string, env: Env): boolean {
  return origin === env.ALLOWED_ORIGIN || LOCAL_ORIGIN.test(origin)
}

// ---- per-IP limiter: in memory only, never written anywhere ----

const hits = new Map<string, { start: number; count: number }>()

function limited(ip: string, now: number): boolean {
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (now - v.start >= RATE_WINDOW_MS) hits.delete(k)
  }
  const cur = hits.get(ip)
  if (!cur || now - cur.start >= RATE_WINDOW_MS) {
    hits.set(ip, { start: now, count: 1 })
    return false
  }
  cur.count += 1
  return cur.count > RATE_LIMIT
}

// ---- /api/rank ----

interface RankInput {
  history: string[]
  cards: string[]
  tz: string
  session: string
}

function allKnownIds(v: unknown, min: number, max: number): v is string[] {
  return Array.isArray(v) && v.length >= min && v.length <= max && v.every((x) => typeof x === 'string' && IDS.has(x))
}

function parseRank(raw: unknown): RankInput | null {
  if (!isRecord(raw)) return null
  const { history, cards, tz, session } = raw
  if (!allKnownIds(history, 0, 24)) return null
  if (!allKnownIds(cards, 4, 4)) return null
  if (typeof tz !== 'string' || tz.length < 1 || tz.length > 64) return null
  if (typeof session !== 'string' || session.length < 1 || session.length > 64) return null
  return { history, cards, tz, session }
}

function timeoutMs(env: Env): number {
  const n = Number(env.UPSTREAM_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS)
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_TIMEOUT_MS
}

/** Returns the 4 scores in card order (null when absent), or null on any upstream failure. */
async function callUpstream(env: Env, input: RankInput, apiKey: string): Promise<(number | null)[] | null> {
  const domains = { market: 'us', postal_code: 'unk', gender: 'unk', age_group: 'unk' }
  const end = Date.now()
  const last = input.history.length - 1
  const events = input.history.map((product, k) => ({
    store_id: env.UNBOX_CATALOG_ID,
    domains,
    timezone: input.tz,
    timestamp: new Date(end - (last - k) * 1000).toISOString(),
    event: { type: 'viewItem', product },
    session_id: input.session,
  }))
  const body = {
    history: events,
    store_id: env.UNBOX_CATALOG_ID,
    domains,
    timezone: input.tz,
    limit: 100,
    offset: 0,
    filters: {},
    register_event: false,
  }

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs(env))
  try {
    const res = await fetch(UPSTREAM_URL, {
      method: 'POST',
      // The official SDK names the catalog in x-catalog-id as well as in the body's store_id.
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'x-catalog-id': env.UNBOX_CATALOG_ID },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    })
    if (res.status !== 200) {
      // Status and the start of the API's reason only. The key travels in a header and is never logged.
      console.warn('upstream', res.status, (await res.text()).slice(0, 300))
      return null
    }
    const data: unknown = await res.json()
    // The live API nests the ranked page under "products" ({ products: { items } }); accept a top-level items too.
    const page = isRecord(data) && isRecord(data.products) ? data.products : data
    if (!isRecord(page) || !Array.isArray(page.items)) {
      console.warn('upstream shape', JSON.stringify(data).slice(0, 300))
      return null
    }
    const byId = new Map<string, number>()
    for (const it of page.items as unknown[]) {
      if (isRecord(it) && typeof it.id === 'string' && typeof it.score === 'number' && Number.isFinite(it.score) && !byId.has(it.id)) {
        byId.set(it.id, it.score)
      }
    }
    return input.cards.map((c) => byId.get(c) ?? null)
  } catch (err) {
    console.warn('upstream failed', err instanceof Error ? err.name : 'unknown')
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function handleRank(req: Request, env: Env, cors: Headers_): Promise<Response> {
  if (limited(req.headers.get('cf-connecting-ip') ?? 'unknown', Date.now())) {
    return reply(429, { error: 'rate_limited' }, { ...cors, 'retry-after': '60' })
  }
  const text = await req.text()
  if (text.length > MAX_BODY_CHARS) return reply(400, { error: 'bad_request' }, cors)
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return reply(400, { error: 'bad_request' }, cors)
  }
  const input = parseRank(raw)
  if (!input) return reply(400, { error: 'bad_request' }, cors)

  const apiKey = env.UNBOXAI_API_KEY
  if (!apiKey) return reply(503, { fallback: true }, cors)

  const t0 = Date.now()
  const scores = await callUpstream(env, input, apiKey)
  if (!scores) return reply(502, { fallback: true }, cors)
  return reply(200, { scores, engine: 'behaviorgpt-v4', ms: Date.now() - t0 }, cors)
}

// ---- /api/result and /api/stats ----

interface ResultInput {
  runId: string
  called1: number
  defied: number
  calledDefy: number
  engine: string
}

function parseResult(raw: unknown): ResultInput | null {
  if (!isRecord(raw)) return null
  const { runId, called1, defied, calledDefy, obeyed, engine } = raw
  if (typeof runId !== 'string' || !RUN_ID.test(runId)) return null
  if (typeof engine !== 'string' || !ENGINES.includes(engine)) return null
  if (!Number.isInteger(called1) || !Number.isInteger(defied) || !Number.isInteger(calledDefy) || !Number.isInteger(obeyed)) return null
  const c1 = called1 as number
  const d = defied as number
  const cd = calledDefy as number
  if (c1 < 0 || c1 > 6) return null
  if (d < 0 || d > 6) return null
  if (cd < 0 || cd > d) return null
  if (obeyed !== 6 - d) return null
  return { runId, called1: c1, defied: d, calledDefy: cd, engine }
}

function emptyStats(): Stats {
  return { n: 0, histogram: new Array<number>(11).fill(0), mean: 0 }
}

async function readStats(kv: KVLike): Promise<Stats> {
  const raw = await kv.get('stats')
  if (!raw) return emptyStats()
  try {
    const v: unknown = JSON.parse(raw)
    if (
      isRecord(v) &&
      typeof v.n === 'number' &&
      typeof v.mean === 'number' &&
      Array.isArray(v.histogram) &&
      v.histogram.length === 11 &&
      v.histogram.every((x) => typeof x === 'number')
    ) {
      return { n: v.n, histogram: v.histogram as number[], mean: v.mean }
    }
  } catch {
    // fall through to an empty histogram
  }
  return emptyStats()
}

async function handleResult(req: Request, env: Env, cors: Headers_): Promise<Response> {
  const text = await req.text()
  if (text.length > MAX_BODY_CHARS) return reply(400, { error: 'bad_request' }, cors)
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return reply(400, { error: 'bad_request' }, cors)
  }
  const r = parseResult(raw)
  if (!r) return reply(400, { error: 'bad_request' }, cors)

  const runKey = `run:${r.runId}`
  if ((await env.DEFY_KV.get(runKey)) !== null) return reply(200, { ok: true }, cors)
  // Mark the run first so a retry can never count it twice.
  await env.DEFY_KV.put(runKey, '1', { expirationTtl: RUN_TTL_SECONDS })

  const pct = Math.round((100 * (r.called1 + r.calledDefy)) / (6 + r.defied))
  const bin = Math.min(10, Math.max(0, Math.round(pct / 10)))
  const stats = await readStats(env.DEFY_KV)
  stats.histogram[bin] += 1
  stats.mean = (stats.mean * stats.n + pct) / (stats.n + 1)
  stats.n += 1
  await env.DEFY_KV.put('stats', JSON.stringify(stats))
  return reply(200, { ok: true }, cors)
}

async function handleStats(env: Env, cors: Headers_): Promise<Response> {
  const stats = await readStats(env.DEFY_KV)
  return reply(200, stats, { ...cors, 'cache-control': 'public, max-age=30' })
}

// ---- router ----

const ROUTES: Record<string, string> = {
  '/api/rank': 'POST',
  '/api/result': 'POST',
  '/api/stats': 'GET',
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const origin = req.headers.get('origin')
    let cors: Headers_ = {}
    if (origin !== null) {
      if (!isAllowedOrigin(origin, env)) return reply(403, { error: 'forbidden' })
      cors = { 'access-control-allow-origin': origin, vary: 'Origin' }
    }

    const path = new URL(req.url).pathname
    const method = ROUTES[path]
    if (method === undefined) return reply(404, { error: 'not_found' }, cors)

    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          ...cors,
          'access-control-allow-methods': 'GET, POST, OPTIONS',
          'access-control-allow-headers': 'content-type',
          'access-control-max-age': '86400',
        },
      })
    }
    if (req.method !== method) return reply(405, { error: 'method_not_allowed' }, { ...cors, allow: `${method}, OPTIONS` })

    if (path === '/api/rank') return handleRank(req, env, cors)
    if (path === '/api/result') return handleResult(req, env, cors)
    return handleStats(env, cors)
  },
}
