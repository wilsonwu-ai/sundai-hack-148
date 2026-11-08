// The 96-item DEFY catalog (src/data/catalog.json) plus lookup and validation.
import raw from '../data/catalog.json'
import { VIBES, type Item } from '../contracts'

export const CATALOG: Item[] = raw as unknown as Item[]

const BY_ID: ReadonlyMap<string, Item> = new Map(CATALOG.map((i) => [i.id, i]))

export function getItem(id: string): Item {
  const item = BY_ID.get(id)
  if (!item) throw new Error(`unknown item id: ${id}`)
  return item
}

const ID_RE = /^[a-z0-9-]{1,32}$/
const NAME_RE = /^[A-Za-z0-9 '-]{4,18}$/
const TONES: readonly string[] = ['warm', 'cool', 'neutral']

/** Returns a list of problems. An empty list means the catalog is valid. */
export function validateCatalog(items: Item[]): string[] {
  const errors: string[] = []
  if (items.length !== 96) errors.push(`expected 96 items, found ${items.length}`)

  for (const v of VIBES) {
    const n = items.filter((i) => i.vibe === v).length
    if (n !== 16) errors.push(`vibe ${v} has ${n} items, expected 16`)
  }

  const ids = new Set<string>()
  const names = new Set<string>()
  const emojis = new Set<string>()
  for (const i of items) {
    const tag = `item ${String(i.id)}`
    if (!VIBES.includes(i.vibe)) errors.push(`${tag}: unknown vibe ${String(i.vibe)}`)
    if (typeof i.id !== 'string' || !ID_RE.test(i.id)) errors.push(`${tag}: bad id`)
    if (ids.has(i.id)) errors.push(`${tag}: duplicate id`)
    ids.add(i.id)

    if (typeof i.name !== 'string' || !NAME_RE.test(i.name)) errors.push(`${tag}: bad name`)
    const lower = String(i.name).toLowerCase()
    if (names.has(lower)) errors.push(`${tag}: duplicate name`)
    names.add(lower)

    if (typeof i.emoji !== 'string' || i.emoji.length === 0 || i.emoji.length > 8 || /[A-Za-z0-9]/.test(i.emoji)) {
      errors.push(`${tag}: bad emoji`)
    }
    if (emojis.has(i.emoji)) errors.push(`${tag}: duplicate emoji`)
    emojis.add(i.emoji)

    if (typeof i.category !== 'string' || !i.category.includes(' > ')) errors.push(`${tag}: category needs " > "`)
    if (![1, 2, 3, 4].includes(i.price)) errors.push(`${tag}: price must be 1 to 4`)
    if (!TONES.includes(i.tone)) errors.push(`${tag}: bad tone`)
  }

  const lowers = items.map((i) => String(i.name).toLowerCase())
  for (let a = 0; a < lowers.length; a++) {
    for (let b = 0; b < lowers.length; b++) {
      if (a !== b && lowers[a] !== lowers[b] && lowers[a].includes(lowers[b])) {
        errors.push(`name "${items[a].name}" contains name "${items[b].name}"`)
      }
    }
  }
  return errors
}
