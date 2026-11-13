/**
 * Deterministic helpers for the mock layer. Nothing here uses Math.random, so the
 * same seed always produces the same catalog, ids and latencies.
 */

/** mulberry32 — tiny seeded PRNG returning floats in [0, 1). */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function pick<T>(random: () => number, items: readonly T[]): T {
  const item = items[Math.floor(random() * items.length)]
  if (item === undefined) throw new Error('pick() called with an empty list')
  return item
}

export function randomInt(random: () => number, min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1))
}

/** FNV-1a 32-bit hash of a string. */
export function hash32(input: string): number {
  let hash = 0x811c9dc5
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/** Stable hex digest of arbitrary length derived from a string (not cryptographic). */
export function hashHex(input: string, length = 16): string {
  const random = createRandom(hash32(input))
  let out = ''
  while (out.length < length) {
    out += Math.floor(random() * 0x100000000)
      .toString(16)
      .padStart(8, '0')
  }
  return out.slice(0, length)
}

/** JSON with sorted keys, so equal objects always serialize to the same string. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeys(value))
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, entry]) => [key, sortKeys(entry)]),
    )
  }
  return value
}
