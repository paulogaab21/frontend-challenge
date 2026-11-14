import { describe, expect, test } from 'vitest'

import { countPages } from './carousel-pages'

describe('countPages', () => {
  test('counts the screens a track scrolls through', () => {
    expect(countPages({ clientWidth: 1200, scrollWidth: 2424 }, 10)).toBe(3)
    expect(countPages({ clientWidth: 366, scrollWidth: 2424 }, 10)).toBe(7)
    expect(countPages({ clientWidth: 1200, scrollWidth: 1200 }, 4)).toBe(1)
  })

  test('a track without width has one page instead of an infinite number', () => {
    // Reported by the browser in the middle of a viewport change.
    expect(countPages({ clientWidth: 0, scrollWidth: 2424 }, 10)).toBe(1)
    expect(countPages({ clientWidth: 0, scrollWidth: 0 }, 10)).toBe(1)
    expect(countPages({ clientWidth: Number.NaN, scrollWidth: 2424 }, 10)).toBe(1)
  })

  test('never reports more pages than items, nor fewer than one', () => {
    expect(countPages({ clientWidth: 1, scrollWidth: 2424 }, 10)).toBe(10)
    expect(countPages({ clientWidth: 300, scrollWidth: 0 }, 0)).toBe(1)
  })
})
