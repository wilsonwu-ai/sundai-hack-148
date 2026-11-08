// DEFY frozen contracts (SPEC.md §3). Written by the orchestrator; builders import, never edit.

export type Vibe = 'cozy' | 'adventure' | 'tech' | 'luxe' | 'wellness' | 'indulgent'
export const VIBES: readonly Vibe[] = ['cozy', 'adventure', 'tech', 'luxe', 'wellness', 'indulgent']
/** Ring order for the vibe-distance feature (neighbours are similar). */
export const VIBE_RING: readonly Vibe[] = ['cozy', 'indulgent', 'luxe', 'tech', 'adventure', 'wellness']

export type Tone = 'warm' | 'cool' | 'neutral'

export interface Item {
  id: string
  name: string
  emoji: string
  vibe: Vibe
  category: string
  price: 1 | 2 | 3 | 4
  tone: Tone
}

/** 0 top-left, 1 top-right, 2 bottom-left, 3 bottom-right */
export type Position = 0 | 1 | 2 | 3

export interface Turn {
  round: 1 | 2
  /** 4 ids in position order */
  cards: string[]
  /** round 2 only: the card the model showed as its guess */
  shown?: string
  /** the id the model sealed before the tap */
  sealed: string
  pick: string
  position: Position
}

export interface Context {
  round: 1 | 2
  tz: string
  hour: number
  weekday: number
}

export interface Prediction {
  /** 4 probabilities in card order, summing to 1 */
  probs: number[]
  top: string
  /** round 2 only: argmax over the non-shown cards */
  defiance?: string
  engine: 'behaviorgpt-v4' | 'habit-local'
}

export interface Predictor {
  readonly engine: Prediction['engine']
  predict(history: Turn[], cards: string[], ctx: Context, shown?: string): Promise<Prediction>
  observe(turn: Turn): void
}

export interface Seal {
  /** hex sha-256 of `${id}:${salt}` */
  commitment: string
  /** 32 hex chars (16 random bytes) */
  salt: string
}

export interface RunResult {
  runId: string
  called1: number
  defied: number
  calledDefy: number
  obeyed: number
  engine: Prediction['engine']
}

export interface Stats {
  n: number
  /** 11 bins: 0, 10, ..., 100 (predictability %, rounded to the nearest 10) */
  histogram: number[]
  mean: number
}

export interface Trait {
  id: 'taste' | 'position' | 'defiance'
  label: string
  /** 0..1 */
  strength: number
}

// ---- Game (SPEC §3 "Game (FROZEN)") ----

export interface TurnView {
  round: 1 | 2
  /** 0..5 within the round */
  index: number
  /** position order */
  cards: Item[]
  /** round 2 only */
  shown?: string
  /** full hex commitment of the sealed id; the sealed id itself is never in a TurnView */
  commitment: string
}

export type RevealStatus = 'called' | 'missed' | 'calledDefy' | 'escaped' | 'obeyed'

export const REVEAL_WORDS: Record<RevealStatus, string> = {
  called: 'Called it',
  missed: 'Missed',
  calledDefy: 'Called your defiance',
  escaped: 'Escaped',
  obeyed: 'You obeyed',
}

export interface Reveal {
  status: RevealStatus
  turn: Turn
  seal: Seal
}

export interface GameOptions {
  seed: number
  predictor: Predictor
  ctx: Omit<Context, 'round'>
}

// ---- Science panel (src/data/facts.json, generated from research/verified.json) ----

export interface ScienceFact {
  /** verified fact ids this card rests on */
  ids: string[]
  group: 'you' | 'science' | 'machine' | 'stakes'
  /** big display figure, or null for a quote card */
  stat: string | null
  line: string
  source: string
  url: string
}

export const TURNS_PER_ROUND = 6
export const FOOTER_LINE = 'A toy, not a study. Twelve taps cannot measure free will.'
export const HOOK = 'Never let them predict your next move.'
export const CARD_LINE = "It told me what I'd pick. I picked something else. It saw that coming too."
