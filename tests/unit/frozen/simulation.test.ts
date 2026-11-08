// FROZEN (orchestrator). Acceptance A2: honesty + landing, 200 seeded games per simulated player,
// played through the real Game and HabitModel. Thresholds sit ~10 points under the calibration
// prototype (research/calibration.md, scripts/calibrate-habit.mjs).
import { describe, it, expect } from 'vitest'
import { Game } from '../../../src/engine/game'
import { HabitModel } from '../../../src/engine/habit'
import { mulberry32 } from '../../../src/engine/rng'
import { getItem } from '../../../src/engine/catalog'
import { VIBES, type Reveal, type TurnView, type Vibe } from '../../../src/contracts'

type Player = (v: TurnView, rank: Vibe[], rnd: () => number) => string

const favourite = (ids: string[], rank: Vibe[]) =>
  ids.reduce((a, b) => (rank.indexOf(getItem(b).vibe) < rank.indexOf(getItem(a).vibe) ? b : a))
const ids = (v: TurnView) => v.cards.map((c) => c.id)

const consistent: Player = (v, rank) => favourite(ids(v), rank)
const corner: Player = (v) => v.cards[3].id
const random: Player = (v, _rank, rnd) => v.cards[Math.floor(rnd() * 4)].id
const defier: Player = (v, rank) =>
  v.round === 1 ? favourite(ids(v), rank) : favourite(ids(v).filter((id) => id !== v.shown), rank)

function shuffle<T>(a: T[], r: () => number): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

async function play(seed: number, player: Player): Promise<Reveal[]> {
  const rank = shuffle([...VIBES], mulberry32(seed * 7 + 3))
  const rnd = mulberry32(seed * 131 + 17)
  const g = new Game({ seed, predictor: new HabitModel(), ctx: { tz: 'UTC', hour: 12, weekday: 0 } })
  const out: Reveal[] = []
  for (let v = await g.next(); v; v = await g.next()) out.push(await g.pick(player(v, rank, rnd)))
  return out
}

const SEEDS = Array.from({ length: 200 }, (_, k) => k + 1)

async function rate(player: Player, keep: (r: Reveal, t: number) => boolean, hit: (r: Reveal) => boolean) {
  let n = 0
  let h = 0
  for (const s of SEEDS) {
    const reveals = await play(s, player)
    reveals.forEach((r, t) => {
      if (!keep(r, t)) return
      n++
      if (hit(r)) h++
    })
  }
  return { pct: (100 * h) / n, n }
}

const lateRound1 = (_r: Reveal, t: number) => t >= 2 && t < 6
const round1 = (_r: Reveal, t: number) => t < 6
const defiances = (r: Reveal) => r.status === 'calledDefy' || r.status === 'escaped'
const called = (r: Reveal) => r.status === 'called'
const calledDefy = (r: Reveal) => r.status === 'calledDefy'

describe('A2 simulation', () => {
  it('lands: a consistent-taste player is called >= 65% on Round 1 turns 3-6', async () => {
    const { pct } = await rate(consistent, lateRound1, called)
    console.log(`[A2] consistent taste, R1 turns 3-6: ${pct.toFixed(1)}% (chance 25%)`)
    expect(pct).toBeGreaterThanOrEqual(65)
  })

  it('lands: a corner-tapper is called >= 75% on Round 1 turns 3-6', async () => {
    const { pct } = await rate(corner, lateRound1, called)
    console.log(`[A2] corner tapper, R1 turns 3-6: ${pct.toFixed(1)}% (chance 25%)`)
    expect(pct).toBeGreaterThanOrEqual(75)
  })

  it('is honest: a random player sits at chance in both rounds', async () => {
    const r1 = await rate(random, round1, called)
    const r2 = await rate(random, (r) => defiances(r), calledDefy)
    console.log(`[A2] random, R1: ${r1.pct.toFixed(1)}% (chance 25%); R2 defiances called: ${r2.pct.toFixed(1)}% (chance 33.3%), n=${r2.n}`)
    expect(Math.abs(r1.pct - 25)).toBeLessThanOrEqual(6)
    expect(Math.abs(r2.pct - 100 / 3)).toBeLessThanOrEqual(6)
  })

  it('reads defiance: a defier who takes their next favourite is called >= 60%', async () => {
    let obeyed = 0
    for (const s of SEEDS.slice(0, 20)) obeyed += (await play(s, defier)).filter((r) => r.status === 'obeyed').length
    expect(obeyed).toBe(0)
    const { pct } = await rate(defier, (r) => defiances(r), calledDefy)
    console.log(`[A2] defier (next favourite), defiances called: ${pct.toFixed(1)}% (chance 33.3%)`)
    expect(pct).toBeGreaterThanOrEqual(60)
  })
})
