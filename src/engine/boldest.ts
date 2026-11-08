// The pick the model least expected. Each turn keeps the odds the sealing prediction gave the card that was then
// picked, recorded after the tap, so nothing here can leak a guess before it is revealed.
import type { Prediction, Turn } from '../contracts'

export interface TurnOdds {
  /** the sealing prediction's probability for the card that was then picked, 0 to 1 */
  odds: number
  engine: Prediction['engine']
}

export interface Boldest {
  /** 0-based turn index */
  index: number
  turn: Turn
  odds: number
  engine: Prediction['engine']
}

/** The turn whose pick had the lowest odds. Ties go to the earlier turn; null when no turn has valid odds. */
export function boldestMove(turns: readonly Turn[], odds: readonly TurnOdds[]): Boldest | null {
  let best: Boldest | null = null
  const n = Math.min(turns.length, odds.length)
  for (let i = 0; i < n; i++) {
    const o = odds[i]
    if (!Number.isFinite(o.odds) || o.odds < 0 || o.odds > 1) continue
    if (best === null || o.odds < best.odds) best = { index: i, turn: turns[i], odds: o.odds, engine: o.engine }
  }
  return best
}

/** Odds as copy: "a 7% chance", "an 8% chance", "less than a 1% chance". */
export function oddsPhrase(odds: number): string {
  const pct = Math.round(odds * 100)
  if (pct < 1) return 'less than a 1% chance'
  // eight, eleven, eighteen and eighty-something start with a vowel sound
  const an = pct === 8 || pct === 11 || pct === 18 || (pct >= 80 && pct <= 89)
  return `${an ? 'an' : 'a'} ${pct}% chance`
}
