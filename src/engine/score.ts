// Scoring formulas (SPEC section 3, frozen).
import { TURNS_PER_ROUND, type Prediction, type RunResult, type Stats, type Turn } from '../contracts'

export function scoreRun(turns: Turn[], engine: Prediction['engine'], runId: string): RunResult {
  let called1 = 0
  let defied = 0
  let calledDefy = 0
  for (const t of turns) {
    if (t.round === 1) {
      if (t.sealed === t.pick) called1++
    } else if (t.pick !== t.shown) {
      defied++
      if (t.sealed === t.pick) calledDefy++
    }
  }
  return { runId, called1, defied, calledDefy, obeyed: TURNS_PER_ROUND - defied, engine }
}

/** Integer 0-100: how often the sealed guess was right, over Round 1 turns plus Round 2 defiances. */
export function predictability(r: RunResult): number {
  return Math.round((100 * (r.called1 + r.calledDefy)) / (TURNS_PER_ROUND + r.defied))
}

/** What blind guessing would score: 1 in 4 on Round 1, 1 in 3 on each defiance. */
export function chance(r: RunResult): { called1: number; calledDefy: number } {
  return { called1: TURNS_PER_ROUND / 4, calledDefy: r.defied / 3 }
}

/** Share of players this score beats (half of your own bin counts). Null below 20 players. */
export function percentile(pct: number, stats: Stats | null): number | null {
  if (!stats || stats.n < 20) return null
  const bin = Math.min(10, Math.max(0, Math.round(pct / 10)))
  let below = 0
  for (let i = 0; i < bin; i++) below += stats.histogram[i] ?? 0
  const same = stats.histogram[bin] ?? 0
  return Math.round((100 * (below + 0.5 * same)) / stats.n)
}
