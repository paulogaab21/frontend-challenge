/**
 * Decides whether a realtime event may be applied.
 *
 * Delivery over a socket is at-least-once and unordered across reconnections, so
 * the same event can arrive twice and an old one can arrive late. The guard makes
 * applying events idempotent and monotonic:
 * - an event id seen before is a `duplicate`;
 * - an event whose version is not higher than the last one applied to the same
 *   resource is `stale`.
 * Only `accepted` events reach the cache and the UI.
 */

export interface GuardedEvent {
  id: string
  version: number
  resource: { type: string; id: string }
}

export type GuardVerdict = 'accepted' | 'duplicate' | 'stale'

export interface EventGuard {
  check: (event: GuardedEvent) => GuardVerdict
  /**
   * Records a version learned outside the event stream (a REST response), raising
   * the floor for that resource so older events cannot undo fresher data.
   */
  observe: (resourceType: string, resourceId: string, version: number) => void
  reset: () => void
}

export function createEventGuard(maxRememberedIds = 500): EventGuard {
  let seenIds = new Set<string>()
  let versions = new Map<string, number>()

  const keyOf = (type: string, id: string) => `${type}:${id}`

  return {
    check(event) {
      if (seenIds.has(event.id)) return 'duplicate'

      seenIds.add(event.id)
      if (seenIds.size > maxRememberedIds) {
        // Sets iterate in insertion order: drop the oldest id.
        const oldest = seenIds.values().next().value
        if (oldest !== undefined) seenIds.delete(oldest)
      }

      const key = keyOf(event.resource.type, event.resource.id)
      const applied = versions.get(key) ?? 0
      if (event.version <= applied) return 'stale'

      versions.set(key, event.version)
      return 'accepted'
    },

    observe(resourceType, resourceId, version) {
      const key = keyOf(resourceType, resourceId)
      if (version > (versions.get(key) ?? 0)) versions.set(key, version)
    },

    reset() {
      seenIds = new Set()
      versions = new Map()
    },
  }
}
