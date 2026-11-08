// FROZEN (orchestrator). SPEC §3 catalog + deck + rng.
import { describe, it, expect } from 'vitest'
import { CATALOG, getItem, validateCatalog } from '../../../src/engine/catalog'
import { dealTurn } from '../../../src/engine/deck'
import { mulberry32 } from '../../../src/engine/rng'
import { VIBES, type Item } from '../../../src/contracts'

describe('catalog', () => {
  it('passes its own validator', () => {
    expect(validateCatalog(CATALOG)).toEqual([])
  })

  it('has 96 items, 16 per vibe, unique ids and names', () => {
    expect(CATALOG).toHaveLength(96)
    for (const v of VIBES) expect(CATALOG.filter((i) => i.vibe === v)).toHaveLength(16)
    expect(new Set(CATALOG.map((i) => i.id)).size).toBe(96)
    expect(new Set(CATALOG.map((i) => i.name.toLowerCase())).size).toBe(96)
  })

  it('items are generic, clean and card-sized', () => {
    for (const i of CATALOG) {
      expect(i.id).toMatch(/^[a-z0-9-]{1,32}$/)
      expect(i.name).toMatch(/^[A-Za-z0-9 '-]{4,18}$/)
      expect(i.emoji.length).toBeGreaterThan(0)
      expect(i.emoji.length).toBeLessThanOrEqual(8)
      expect(i.emoji).not.toMatch(/[A-Za-z0-9]/)
      expect(i.category).toContain(' > ')
      expect([1, 2, 3, 4]).toContain(i.price)
      expect(['warm', 'cool', 'neutral']).toContain(i.tone)
    }
  })

  it('getItem finds every id and throws on unknown ids', () => {
    for (const i of CATALOG) expect(getItem(i.id)).toEqual(i)
    expect(() => getItem('not-a-real-item')).toThrow()
  })

  it('validator rejects broken catalogs', () => {
    const dup: Item[] = [...CATALOG.slice(0, 95), { ...CATALOG[0] }]
    expect(validateCatalog(dup).length).toBeGreaterThan(0)
    expect(validateCatalog(CATALOG.slice(0, 90)).length).toBeGreaterThan(0)
    const badPrice = CATALOG.map((i, k) => (k === 0 ? { ...i, price: 9 as unknown as Item['price'] } : i))
    expect(validateCatalog(badPrice).length).toBeGreaterThan(0)
  })
})

describe('rng + deck', () => {
  it('mulberry32 is deterministic and in [0, 1)', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    for (let k = 0; k < 1000; k++) {
      const x = a()
      expect(x).toBe(b())
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThan(1)
    }
    expect(mulberry32(1)()).not.toBe(mulberry32(2)())
  })

  it('deals 12 turns of 4 cards with 4 different vibes and no repeats', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const rng = mulberry32(seed)
      const used = new Set<string>()
      const seen = new Set<string>()
      for (let t = 0; t < 12; t++) {
        const ids = dealTurn(rng, used)
        expect(ids).toHaveLength(4)
        expect(new Set(ids.map((id) => getItem(id).vibe)).size).toBe(4)
        for (const id of ids) {
          expect(seen.has(id)).toBe(false)
          seen.add(id)
          expect(used.has(id)).toBe(true)
        }
      }
      expect(used.size).toBe(48)
    }
  })

  it('is deterministic per seed', () => {
    const run = (s: number) => {
      const r = mulberry32(s)
      const u = new Set<string>()
      return Array.from({ length: 12 }, () => dealTurn(r, u))
    }
    expect(run(7)).toEqual(run(7))
    expect(run(7)).not.toEqual(run(8))
  })

  it('puts vibes in random positions (no vibe owns a corner)', () => {
    const counts: Record<string, number[]> = {}
    for (let seed = 1; seed <= 300; seed++) {
      dealTurn(mulberry32(seed), new Set()).forEach((id, pos) => {
        const v = getItem(id).vibe
        ;(counts[v] ??= [0, 0, 0, 0])[pos]++
      })
    }
    expect(Object.keys(counts)).toHaveLength(6)
    for (const v of Object.keys(counts)) for (const c of counts[v]) expect(c).toBeGreaterThan(20)
  })
})
