// Turns a finished run into up to 3 plain, light-hearted traits.
// Labels are about picks only: never about health, money, relationships or identity.
import { VIBE_RING, VIBES, type Trait, type Turn, type Vibe } from '../contracts'
import { getItem } from './catalog'
import type { HabitModel } from './habit'

/** Below this weight gap between the top and bottom vibe there is no taste to report. */
const MIN_TASTE_GAP = 0.5
/** One position must hold at least this share of picks to count as a habit. */
const MIN_POSITION_SHARE = 0.5
const MIN_DEFIANCES = 2
const POSITION_NAMES = ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const

function ringSteps(a: Vibe, b: Vibe): number {
  const d = Math.abs(VIBE_RING.indexOf(a) - VIBE_RING.indexOf(b))
  return Math.min(d, VIBE_RING.length - d)
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x))
}

function tasteTrait(habit: HabitModel): Trait | null {
  const w = habit.vibeWeights()
  let fav: Vibe = VIBES[0]
  let least: Vibe = VIBES[0]
  for (const v of VIBES) {
    if (w[v] > w[fav]) fav = v
    if (w[v] < w[least]) least = v
  }
  const gap = w[fav] - w[least]
  if (gap < MIN_TASTE_GAP) return null
  return { id: 'taste', label: `Picks ${fav} over ${least}`, strength: clamp01(Math.tanh(gap / 2)) }
}

function positionTrait(turns: Turn[]): Trait | null {
  if (turns.length === 0) return null
  const counts = [0, 0, 0, 0]
  for (const t of turns) counts[t.position]++
  let top = 0
  for (let i = 1; i < counts.length; i++) if (counts[i] > counts[top]) top = i
  const share = counts[top] / turns.length
  if (share < MIN_POSITION_SHARE) return null
  return { id: 'position', label: `Taps the ${POSITION_NAMES[top]} card`, strength: clamp01(share) }
}

function defianceTrait(turns: Turn[], habit: HabitModel): Trait | null {
  const defiances = turns.filter((t): t is Turn & { shown: string } => t.round === 2 && t.shown !== undefined && t.pick !== t.shown)
  if (defiances.length < MIN_DEFIANCES) return null
  const w = habit.vibeWeights()
  let next = 0
  let opposite = 0
  for (const t of defiances) {
    const pickVibe = getItem(t.pick).vibe
    const shownVibe = getItem(t.shown).vibe
    let best: Vibe | null = null
    for (const id of t.cards) {
      if (id === t.shown) continue
      const v = getItem(id).vibe
      if (best === null || w[v] > w[best]) best = v
    }
    if (best !== null && pickVibe === best) next++
    if (ringSteps(pickVibe, shownVibe) >= 2) opposite++
  }
  const n = defiances.length
  if (next * 2 > n) return { id: 'defiance', label: 'Defies with your next favourite', strength: clamp01(next / n) }
  if (opposite * 2 > n) return { id: 'defiance', label: 'Defies with the opposite vibe', strength: clamp01(opposite / n) }
  return { id: 'defiance', label: 'Defies unpredictably', strength: clamp01(1 - Math.max(next, opposite) / n) }
}

export function fingerprint(turns: Turn[], habit: HabitModel): Trait[] {
  const out: Trait[] = []
  const taste = tasteTrait(habit)
  if (taste) out.push(taste)
  const position = positionTrait(turns)
  if (position) out.push(position)
  const defiance = defianceTrait(turns, habit)
  if (defiance) out.push(defiance)
  return out.slice(0, 3)
}
