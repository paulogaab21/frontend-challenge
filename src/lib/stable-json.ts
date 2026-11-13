/**
 * JSON with object keys sorted recursively: two values that are structurally equal
 * always serialize to the same string, whatever order their keys were written in.
 */
export function stableStringify(value: unknown): string {
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

export function isDeepEqual(a: unknown, b: unknown): boolean {
  return stableStringify(a) === stableStringify(b)
}
