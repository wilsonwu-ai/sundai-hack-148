// Deals one turn: 4 cards, 4 different vibes, random positions, none used before.
import { VIBES, type Vibe } from '../contracts'
import { CATALOG } from './catalog'

function shuffle<T>(a: T[], rng: () => number): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const BY_VIBE: Record<Vibe, string[]> = {
  cozy: [],
  adventure: [],
  tech: [],
  luxe: [],
  wellness: [],
  indulgent: [],
}
for (const item of CATALOG) BY_VIBE[item.vibe].push(item.id)

/** Returns 4 ids in position order and adds them to `used`. */
export function dealTurn(rng: () => number, used: Set<string>): string[] {
  const vibes = shuffle([...VIBES], rng).slice(0, 4)
  const ids = vibes.map((v) => {
    const pool = BY_VIBE[v].filter((id) => !used.has(id))
    if (pool.length === 0) throw new Error(`no unused ${v} items left`)
    return pool[Math.floor(rng() * pool.length)]
  })
  for (const id of ids) used.add(id)
  return ids
}
