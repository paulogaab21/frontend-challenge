import type { Locator, Page } from '@playwright/test'
import { expect } from '../fixtures'

export const BRUNO_ADDRESS = '0x1111111111111111111111111111111111111111'
export const SOLANA_ADDRESS = '11111111111111111111111111111111'

export async function chooseOption(page: Page, form: Locator, name: string, option: string) {
  await form.getByRole('combobox', { name, exact: true }).click()
  await page.getByRole('option', { name: option, exact: true }).click()
}

export async function fillBrunoWallet(page: Page, form: Locator) {
  for (const [name, value] of Object.entries({
    'Nome de exibição': 'Bruno Lima',
    'Apelido da carteira': 'Bruno principal',
    'Nome do perfil': 'bruno.lima',
    'Endereço da carteira': BRUNO_ADDRESS,
    'Código de indicação': 'BRUNO26',
    'E-mail': 'bruno@kurio.test',
    'Nome ENS': 'bruno.kurio',
  }))
    await form.getByRole('textbox', { name, exact: true }).fill(value)
  await chooseOption(page, form, 'Rede', 'Ethereum')
  await chooseOption(page, form, 'Tipo de carteira', 'MetaMask')
}

export async function expectHeaderAvatar(page: Page, url: string | null) {
  const menu = page.getByRole('button', { name: /^Menu de / })
  await expect
    .poll(() =>
      menu.evaluate(
        (element) => element.getElementsByTagName('img')[0]?.getAttribute('src') ?? null,
      ),
    )
    .toBe(url)
}

/** A valid, locally generated one-pixel PNG; no file download or shared fixture mutation. */
export const AVATAR_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6MSkAAAAASUVORK5CYII=',
  'base64',
)
