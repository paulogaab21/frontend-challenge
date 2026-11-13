import { db } from '../db'

/**
 * Builds the envelope shared by every realtime event: a stable id, the instant it
 * happened and the version of the resource after the change.
 *
 * The version of a resource never goes backwards, even when the caller passes a
 * stale number, so the stream of a resource is strictly ordered.
 */
export function nextEvent(
  resourceKey: string,
  version: number,
): { id: string; version: number; occurredAt: string } {
  const last = db.state.eventVersions[resourceKey] ?? 0
  const next = Math.max(version, last + 1)
  db.state.eventVersions[resourceKey] = next
  return {
    id: `evt_${String(db.nextId('event')).padStart(6, '0')}`,
    version: next,
    occurredAt: new Date().toISOString(),
  }
}
