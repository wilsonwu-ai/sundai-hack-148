// Commit-and-reveal seals: sha-256 of `${id}:${salt}` with a fresh 16-byte salt.
// Uses globalThis.crypto, which exists in browsers and in Node 22.
import type { Seal } from '../contracts'

function toHex(bytes: Uint8Array): string {
  let out = ''
  for (const b of bytes) out += b.toString(16).padStart(2, '0')
  return out
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return toHex(new Uint8Array(digest))
}

export async function seal(id: string): Promise<Seal> {
  const salt = toHex(globalThis.crypto.getRandomValues(new Uint8Array(16)))
  return { commitment: await sha256Hex(`${id}:${salt}`), salt }
}

export async function verify(id: string, s: Seal): Promise<boolean> {
  return (await sha256Hex(`${id}:${s.salt}`)) === s.commitment
}

/** First 8 hex characters of a commitment, as shown on the sealed card. */
export function short(commitment: string): string {
  return commitment.slice(0, 8)
}
