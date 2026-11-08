// FROZEN (orchestrator). SPEC §3 fingerprint + acceptance A6 (copy rules, verified facts).
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { fingerprint } from '../../../src/engine/fingerprint'
import { Game } from '../../../src/engine/game'
import { HabitModel } from '../../../src/engine/habit'
import { getItem } from '../../../src/engine/catalog'
import { mulberry32 } from '../../../src/engine/rng'
import type { ScienceFact, Trait, Vibe } from '../../../src/contracts'
import facts from '../../../src/data/facts.json'
import verified from '../../../research/verified.json'

const ctx = { tz: 'UTC', hour: 12, weekday: 0 }
const SENSITIVE =
  /\b(health|illness|sick|money|debt|broke|poor|rich|wealth|income|pregnan\w*|baby|relationship|single|divorc\w*|religio\w*|politic\w*|gender|sexual\w*|race|ethnic\w*|age|elderly|disab\w*|mental|depress\w*|anxi\w*)\b/i

async function run(seed: number, choose: (ids: string[], shown: string | undefined) => string) {
  const habit = new HabitModel()
  const g = new Game({ seed, predictor: habit, ctx })
  for (let v = await g.next(); v; v = await g.next()) await g.pick(choose(v.cards.map((c) => c.id), v.shown))
  return fingerprint(g.turns, habit)
}

function clean(traits: Trait[]) {
  expect(traits.length).toBeLessThanOrEqual(3)
  expect(new Set(traits.map((t) => t.id)).size).toBe(traits.length)
  for (const t of traits) {
    expect(['taste', 'position', 'defiance']).toContain(t.id)
    expect(t.strength).toBeGreaterThanOrEqual(0)
    expect(t.strength).toBeLessThanOrEqual(1)
    expect(t.label.length).toBeGreaterThan(0)
    expect(t.label.length).toBeLessThanOrEqual(48)
    expect(t.label).not.toContain('—')
    expect(t.label).not.toMatch(SENSITIVE)
  }
}

describe('fingerprint', () => {
  it('names the favourite vibe of a consistent player', async () => {
    const rank: Vibe[] = ['cozy', 'tech', 'luxe', 'wellness', 'adventure', 'indulgent']
    const best = (ids: string[]) => ids.reduce((a, b) => (rank.indexOf(getItem(b).vibe) < rank.indexOf(getItem(a).vibe) ? b : a))
    const traits = await run(21, (ids) => best(ids))
    clean(traits)
    const taste = traits.find((t) => t.id === 'taste')
    expect(taste).toBeDefined()
    expect(taste?.label.toLowerCase()).toContain('cozy')
  })

  it('spots a corner habit', async () => {
    const traits = await run(22, (ids) => ids[3])
    clean(traits)
    expect(traits.some((t) => t.id === 'position')).toBe(true)
  })

  it('stays clean for random players', async () => {
    for (let s = 1; s <= 25; s++) {
      const r = mulberry32(s * 977)
      clean(await run(s, (ids) => ids[Math.floor(r() * 4)]))
    }
  })
})

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
}

describe('A6 copy', () => {
  it('no em dash and no talking-down labels in shipped source', () => {
    const files = [...walk('src'), ...(existsSync('index.html') ? ['index.html'] : [])].filter((f) => /\.(ts|html|css|json|svg)$/.test(f))
    expect(files.length).toBeGreaterThan(10)
    for (const f of files) {
      const text = readFileSync(f, 'utf8')
      expect(text.includes('—'), `${f} has an em dash`).toBe(false)
      expect(/\bELI5\b|like (?:you're|i'm) (?:five|5)/i.test(text), `${f} has a talking-down label`).toBe(false)
    }
  })

  it('every science fact rests on verified ids and every number traces to a verified quote or claim', () => {
    const V = new Map((verified as { id: string; status: string; quote: string; claim: string }[]).map((e) => [e.id, e]))
    for (const f of facts as ScienceFact[]) {
      expect(f.ids.length).toBeGreaterThan(0)
      const text = f.ids.map((id) => {
        const e = V.get(id)
        expect(e?.status, `${id} must be verified`).toBe('verified')
        return `${e?.quote} ${e?.claim}`
      }).join(' ').replace(/,/g, '')
      const numbers = `${f.stat ?? ''} ${f.line}`.replace(/Round 2/g, '').match(/\d[\d,.]*/g) ?? []
      for (const n of numbers) expect(text.includes(n.replace(/,/g, '').replace(/\.$/, '')), `${f.ids.join('+')}: "${n}" not in its sources`).toBe(true)
      expect(f.url).toMatch(/^https:\/\//)
    }
  })
})
