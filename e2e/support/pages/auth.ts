import type { Page } from '@playwright/test'
import { expect } from '../fixtures'

export async function signIn(page: Page, credentials: { email: string; password: string }) {
  const form = page.getByRole('form', { name: 'Entrar', exact: true })
  await form.getByLabel('E-mail', { exact: true }).fill(credentials.email)
  await form.getByLabel('Senha', { exact: true }).fill(credentials.password)
  await form.getByRole('button', { name: 'Entrar', exact: true }).click()
}

export async function signOut(page: Page, isMobile: boolean) {
  if (isMobile) {
    await page
      .getByRole('navigation', { name: 'Navegação móvel', exact: true })
      .getByRole('link', { name: 'Perfil', exact: true })
      .click()
    await page.getByRole('button', { name: 'Sair', exact: true }).click()
  } else {
    await page.getByRole('button', { name: /^Menu de / }).click()
    await page.getByRole('menuitem', { name: 'Sair', exact: true }).click()
  }
  await expect(page.getByRole('button', { name: /^Menu de / })).toHaveCount(0)
  await expect(page).toHaveURL('/')
}

export function notifications(page: Page) {
  return page.getByRole('region', { name: /Notificações/ })
}
