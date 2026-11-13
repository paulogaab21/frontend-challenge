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
