import { describe, expect, test } from 'vitest'

import { canonicalJson, createRandom, hash32, hashHex, pick, randomInt } from './random'

describe('seeded randomness', () => {
  test('replays the same sequence for a seed, independently of other generators', () => {
    const first = createRandom(20260729)
    const second = createRandom(20260729)
    const other = createRandom(42)
    const values = Array.from({ length: 100 }, () => first())
    other()
    expect(Array.from({ length: 100 }, () => second())).toEqual(values)
    expect(Array.from({ length: 100 }, () => other())).not.toEqual(values)
    expect(values.every((value) => value >= 0 && value < 1)).toBe(true)
    expect(createRandom(1)()).toBe(0.6270739405881613)
  })

  test('normalizes seeds to unsigned 32 bits', () => {
    expect(createRandom(-1)()).toBe(createRandom(0xffffffff)())
    expect(createRandom(0x100000001)()).toBe(createRandom(1)())
  })

  test('selects from a readonly list and includes integer range endpoints', () => {
    expect(pick(() => 0, ['a', 'b'] as const)).toBe('a')
    expect(pick(() => 0.999, ['a', 'b'] as const)).toBe('b')
    expect(() => pick(createRandom(1), [])).toThrow('empty list')
    expect(randomInt(() => 0, 2, 5)).toBe(2)
    expect(randomInt(() => 0.999, 2, 5)).toBe(5)
  })
})

describe('stable serialization and hashing', () => {
  test('sorts nested object keys, preserves array order, nulls and false values', () => {
    const value = { z: undefined, c: [3, { z: 2, a: 1 }], b: null, a: false }
    expect(canonicalJson(value)).toBe('{"a":false,"b":null,"c":[3,{"a":1,"z":2}]}')
    expect(canonicalJson(value)).toBe(canonicalJson({ a: false, b: null, c: [3, { a: 1, z: 2 }] }))
    expect(canonicalJson([1, 2])).not.toBe(canonicalJson([2, 1]))
    expect(canonicalJson([undefined, null])).toBe('[null,null]')
  })

  test('does not mutate the input while canonicalizing', () => {
    const value = Object.freeze({ z: Object.freeze({ b: 2, a: 1 }), a: 0 })
    expect(canonicalJson(value)).toBe('{"a":0,"z":{"a":1,"b":2}}')
    expect(Object.keys(value)).toEqual(['z', 'a'])
  })

  test('matches known FNV-1a vectors', () => {
    expect(hash32('')).toBe(0x811c9dc5)
    expect(hash32('hello')).toBe(0x4f9f2cab)
  })

  test('emits deterministic hex digests of the requested length with stable prefixes', () => {
    const digest = hashHex('kurio', 64)
    expect(digest).toMatch(/^[0-9a-f]{64}$/)
    expect(hashHex('kurio', 64)).toBe(digest)
    expect(hashHex('kurio')).toBe(digest.slice(0, 16))
    expect(hashHex('kurio', 7)).toBe(digest.slice(0, 7))
    expect(hashHex('kurio', 0)).toBe('')
    expect(hashHex('Kurio', 64)).not.toBe(digest)
    expect(hashHex(canonicalJson({ a: 1, b: 2 }))).toBe(hashHex(canonicalJson({ b: 2, a: 1 })))
  })
})
