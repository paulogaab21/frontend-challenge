import type { Locator, Page } from '@playwright/test'
import { expect } from '../fixtures'

interface ShiftWindow extends Window {
  __shadCls?: { value: number; entries: unknown[] }
}

export async function observeLayoutShifts(page: Page) {
  await page.addInitScript(() => {
    const measurement: { value: number; entries: unknown[] } = { value: 0, entries: [] }
    ;(window as ShiftWindow).__shadCls = measurement
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & {
          value: number
          hadRecentInput: boolean
          sources: { node?: Node; previousRect: DOMRectReadOnly; currentRect: DOMRectReadOnly }[]
        }
        if (!shift.hadRecentInput) {
          measurement.value += shift.value
          measurement.entries.push({
            value: shift.value,
            sources: shift.sources.map((source) => ({
              element:
                source.node instanceof Element
                  ? source.node.outerHTML.slice(0, 180)
                  : source.node?.parentElement?.outerHTML.slice(0, 180),
              previous: source.previousRect.toJSON(),
              current: source.currentRect.toJSON(),
            })),
          })
        }
      }
    }).observe({ type: 'layout-shift', buffered: true })
  })
}

export async function layoutShiftDetails(page: Page) {
  return page.evaluate(() => (window as ShiftWindow).__shadCls?.entries ?? [])
}

export async function layoutShiftScore(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  )
  return page.evaluate(() => (window as ShiftWindow).__shadCls?.value ?? 0)
}

export async function expectSameBox(
  before: NonNullable<Awaited<ReturnType<Locator['boundingBox']>>>,
  after: Locator,
) {
  const box = await after.boundingBox()
  expect(box).not.toBeNull()
  for (const dimension of ['x', 'y', 'width', 'height'] as const)
    expect(
      Math.abs(box![dimension] - before[dimension]),
      `${dimension}: skeleton ${before[dimension]}, loaded ${box![dimension]}`,
    ).toBeLessThanOrEqual(1)
}
