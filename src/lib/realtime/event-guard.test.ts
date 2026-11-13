import { describe, expect, test } from 'vitest'

import { createEventGuard, type GuardedEvent } from './event-guard'

function event(
  id: string,
  version: number,
  resourceId = 'emerald-ape-042',
  type = 'nft',
): GuardedEvent {
  return { id, version, resource: { type, id: resourceId } }
}

describe('event guard', () => {
  test('accepts increasing versions and rejects repeated ids and late versions', () => {
    const guard = createEventGuard()
    expect(guard.check(event('one', 1))).toBe('accepted')
    expect(guard.check(event('one', 1))).toBe('duplicate')
    expect(guard.check(event('three', 3))).toBe('accepted')
    expect(guard.check(event('two', 2))).toBe('stale')
    expect(guard.check(event('same-version', 3))).toBe('stale')
    expect(guard.check(event('two', 2))).toBe('duplicate')
    expect(guard.check(event('four', 4))).toBe('accepted')
  })

  test('keeps floors separate by resource type and id; event ids are global', () => {
    const guard = createEventGuard()
    expect(guard.check(event('high', 10, 'shared-id'))).toBe('accepted')
    expect(guard.check(event('other-id', 1, 'another-id'))).toBe('accepted')
    expect(guard.check(event('other-type', 1, 'shared-id', 'order'))).toBe('accepted')
    expect(guard.check(event('high', 20, 'another-id'))).toBe('duplicate')
  })

  test('observe raises the REST floor without allowing a lower observation to roll it back', () => {
    const guard = createEventGuard()
    guard.observe('nft', 'a', 8)
    guard.observe('nft', 'a', 2)
    expect(guard.check(event('old', 7, 'a'))).toBe('stale')
    expect(guard.check(event('equal', 8, 'a'))).toBe('stale')
    expect(guard.check(event('new', 9, 'a'))).toBe('accepted')
    expect(guard.check(event('independent', 1, 'b'))).toBe('accepted')
  })

  test('evicts the oldest remembered ids while retaining resource version floors', () => {
    const guard = createEventGuard(3)
    for (let version = 1; version <= 4; version++) {
      expect(guard.check(event(`event-${version}`, version))).toBe('accepted')
    }
    expect(guard.check(event('event-4', 4))).toBe('duplicate')
    expect(guard.check(event('event-1', 1))).toBe('stale')
    expect(guard.check(event('event-5', 5))).toBe('accepted')
  })

  test('reset clears ids and observed floors for a new session', () => {
    const guard = createEventGuard()
    guard.check(event('one', 1))
    guard.observe('nft', 'emerald-ape-042', 10)
    guard.reset()
    expect(guard.check(event('one', 1))).toBe('accepted')
  })
})
