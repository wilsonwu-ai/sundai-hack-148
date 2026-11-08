// Remote predictor: blends BehaviorGPT scores (through our Worker) into the habit model's logits.
// Any failure means habit logits only, for the rest of the run.
import type { Context, Prediction, Predictor, Turn } from '../contracts'
import type { HabitModel } from './habit'

/** Weight of the z-scored BehaviorGPT scores next to the habit logits. */
export const BG_WEIGHT = 1

const MAX_HISTORY = 24
const FLAT_SD = 1e-12

export interface RemoteOptions {
  apiBase: string
  habit: HabitModel
  session: string
  fetchImpl?: typeof fetch
  timeoutMs?: number
}

function softmax(z: number[]): number[] {
  const m = Math.max(...z)
  const e = z.map((x) => Math.exp(x - m))
  const s = e.reduce((a, b) => a + b, 0)
  return e.map((x) => x / s)
}

/** Null scores take the minimum non-null score; then z-score with the population standard deviation. */
function zscores(scores: (number | null)[]): number[] {
  const real = scores.filter((s): s is number => s !== null)
  const min = Math.min(...real)
  const filled = scores.map((s) => (s === null ? min : s))
  const mu = filled.reduce((a, b) => a + b, 0) / filled.length
  const sd = Math.sqrt(filled.reduce((a, b) => a + (b - mu) ** 2, 0) / filled.length)
  return sd < FLAT_SD ? filled.map(() => 0) : filled.map((x) => (x - mu) / sd)
}

export class RemotePredictor implements Predictor {
  private readonly apiBase: string
  private readonly habit: HabitModel
  private readonly session: string
  private readonly fetchImpl: typeof fetch
  private readonly timeoutMs: number
  private lastEngine: Prediction['engine'] = 'habit-local'
  private failed: boolean
  private cache: { key: string; scores: (number | null)[] } | null = null

  constructor(opts: RemoteOptions) {
    this.apiBase = opts.apiBase.replace(/\/+$/, '')
    this.habit = opts.habit
    this.session = opts.session
    this.fetchImpl = opts.fetchImpl ?? ((input: RequestInfo | URL, init?: RequestInit) => globalThis.fetch(input, init))
    this.timeoutMs = opts.timeoutMs ?? 800
    // With no API base there is nothing to call: behave as already failed.
    this.failed = this.apiBase === ''
  }

  /** The engine behind the last prediction. */
  get engine(): Prediction['engine'] {
    return this.lastEngine
  }

  private async request(body: string): Promise<(number | null)[]> {
    const ac = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        ac.abort()
        reject(new Error('rank timeout'))
      }, this.timeoutMs)
    })
    const call = (async () => {
      const res = await this.fetchImpl(`${this.apiBase}/api/rank`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
        signal: ac.signal,
      })
      if (res.status !== 200) throw new Error(`rank status ${res.status}`)
      const data = (await res.json()) as { scores?: unknown }
      const s = data.scores
      if (!Array.isArray(s) || s.length !== 4) throw new Error('rank: bad scores')
      const out: (number | null)[] = s.map((x: unknown) => {
        if (x === null) return null
        if (typeof x === 'number' && Number.isFinite(x)) return x
        throw new Error('rank: bad score value')
      })
      if (out.every((x) => x === null)) throw new Error('rank: all scores null')
      return out
    })()
    try {
      return await Promise.race([call, timeout])
    } finally {
      clearTimeout(timer)
    }
  }

  /** BehaviorGPT scores for the 4 cards, or null once the network has failed. */
  private async scoresFor(history: Turn[], cards: string[], ctx: Context): Promise<(number | null)[] | null> {
    if (this.failed) return null
    const body = JSON.stringify({
      history: history.slice(-MAX_HISTORY).map((t) => t.pick),
      cards,
      tz: ctx.tz,
      session: this.session,
    })
    // Round 2 asks twice per turn with the same request: reuse the answer.
    if (this.cache && this.cache.key === body) return this.cache.scores
    try {
      const scores = await this.request(body)
      this.cache = { key: body, scores }
      return scores
    } catch {
      this.failed = true
      this.cache = null
      return null
    }
  }

  async predict(history: Turn[], cards: string[], ctx: Context, shown?: string): Promise<Prediction> {
    const scores = await this.scoresFor(history, cards, ctx)
    if (!scores) {
      this.lastEngine = 'habit-local'
      return this.habit.predict(history, cards, ctx, shown)
    }
    const z = zscores(scores)
    const logits = this.habit.logits(cards, shown).map((x, k) => x + BG_WEIGHT * z[k])
    const probs = softmax(logits)
    let top = 0
    for (let i = 1; i < probs.length; i++) if (probs[i] > probs[top]) top = i
    const out: Prediction = { probs, top: cards[top], engine: 'behaviorgpt-v4' }
    if (shown !== undefined) {
      let best = -1
      for (let i = 0; i < cards.length; i++) {
        if (cards[i] === shown) continue
        if (best < 0 || probs[i] > probs[best]) best = i
      }
      if (best >= 0) out.defiance = cards[best]
    }
    this.lastEngine = 'behaviorgpt-v4'
    return out
  }

  observe(turn: Turn): void {
    this.habit.observe(turn)
  }
}
