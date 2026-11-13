/**
 * Search-string (de)serialization for the router.
 *
 * TanStack Router's default encodes values as JSON (`?categoria=%5B%22musica%22%5D`).
 * The catalog state is part of shareable URLs, so plain conventions are used instead:
 * scalars as text and arrays as repeated keys — `?categoria=musica&categoria=jogos`.
 * Types are recovered by each route's `validateSearch` schema.
 */

export type RawSearch = Record<string, string | string[]>

export function parseSearch(searchString: string): RawSearch {
  const params = new URLSearchParams(searchString)
  const result: RawSearch = {}
  for (const key of new Set(params.keys())) {
    const values = params.getAll(key)
    const first = values[0]
    if (first === undefined) continue
    result[key] = values.length > 1 ? values : first
  }
  return result
}

export function stringifySearch(search: Record<string, unknown>): string {
  const params = new URLSearchParams()
  // Sorted keys: the same state always produces the same URL.
  for (const key of Object.keys(search).sort()) {
    const value = search[key]
    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== undefined && item !== null && item !== '') params.append(key, String(item))
      }
    } else {
      params.set(key, String(value))
    }
  }
  const text = params.toString()
  return text ? `?${text}` : ''
}

/** Normalizes "one value or many" into an array, for schemas of repeatable keys. */
export function toArray(value: unknown): unknown[] | undefined {
  if (value === undefined || value === null || value === '') return undefined
  return Array.isArray(value) ? value : [value]
}

/**
 * Only same-origin paths are accepted as a post-login destination, so a crafted
 * link cannot send the collector to another site after signing in.
 */
export function safeRedirect(target: unknown, fallback = '/'): string {
  if (typeof target !== 'string' || !target.startsWith('/') || target.startsWith('//')) {
    return fallback
  }
  return target
}
