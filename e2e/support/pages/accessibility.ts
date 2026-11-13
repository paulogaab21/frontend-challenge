import type { Locator, Page } from '@playwright/test'
import { expect } from '../fixtures'

export async function expectFocusTrapped(page: Page, dialog: Locator) {
  await expect(dialog).toHaveAttribute('aria-modal', 'true')
  await expect
    .poll(() => dialog.evaluate((element) => element.contains(document.activeElement)))
    .toBe(true)
  for (const key of ['Shift+Tab', ...Array<string>(8).fill('Tab')]) {
    await page.keyboard.press(key)
    await expect
      .poll(() => dialog.evaluate((element) => element.contains(document.activeElement)))
      .toBe(true)
  }
}

export async function expectFieldError(field: Locator, message: RegExp) {
  await expect(field).toHaveAttribute('aria-invalid', 'true')
  const ids = (await field.getAttribute('aria-describedby'))?.split(/\s+/) ?? []
  expect(ids.length).toBeGreaterThan(0)
  const errors = await field.evaluate(
    (element, describedBy) =>
      describedBy.map((id) => {
        const error = element.ownerDocument.getElementById(id)
        return { text: error?.textContent ?? '', role: error?.getAttribute('role') }
      }),
    ids,
  )
  expect(errors.some((error) => message.test(error.text) && error.role === 'alert')).toBe(true)
}

export async function tabTo(page: Page, target: Locator, maximum = 90) {
  for (let index = 0; index < maximum; index++) {
    await page.keyboard.press('Tab')
    if (await target.evaluate((element) => element === document.activeElement)) return
  }
  await expect(target).toBeFocused()
}

export async function expectPainted(locator: Locator) {
  await expect
    .poll(() =>
      locator.evaluate((element) => {
        let current: Element | null = element
        let opacity = 1
        while (current) {
          opacity *= Number(getComputedStyle(current).opacity)
          current = current.parentElement
        }
        return opacity
      }),
    )
    .toBe(1)
}
