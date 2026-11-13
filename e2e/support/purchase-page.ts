import { expect, type Locator, type Page } from '@playwright/test'

import { cartSchema, orderSchema, quoteSchema, type LoginRequest, type Quote } from '@/contracts'
import { formatEth } from '@/lib/money'

import { users } from './data'
import type { ApiHelpers } from './fixtures'

export function cartLine(page: Page, name: string, isMobile: boolean): Locator {
  const container = isMobile
    ? page.getByRole('list', { name: 'NFTs no carrinho', exact: true }).getByRole('listitem')
    : page.getByRole('table', { name: 'NFTs no carrinho', exact: true }).getByRole('row')
  return container.filter({ has: page.getByRole('link', { name, exact: true }) })
}

export const cartSummary = (page: Page) =>
  page.getByRole('region', { name: 'Resumo da carteira', exact: true })
export const reviewDialog = (page: Page) => page.getByRole('dialog', { name: 'Revise seu pedido' })

export async function gotoPage(page: Page, path: string): Promise<void> {
  await page.goto(path)
  await page.waitForFunction(() =>
    Boolean(window.__kurioMocks && navigator.serviceWorker.controller),
  )
  await page.waitForLoadState('networkidle')
}

export async function expandCollector(page: Page, isMobile: boolean): Promise<void> {
  if (isMobile && !(await page.getByRole('textbox', { name: 'Nome de exibição' }).isVisible())) {
    await page.getByText('Dados do colecionador', { exact: false }).click()
  }
}

export async function buyDetail(
  page: Page,
  isMobile: boolean,
  edition = '1/50',
  quantity = 1,
): Promise<void> {
  await page.getByRole('radio', { name: edition, exact: true }).check()
  for (let count = 1; count < quantity; count++) {
    const increase = page
      .getByRole('button', { name: 'Aumentar quantidade', exact: true })
      .filter({ visible: true })
    if (isMobile) {
      // Keep the purchase flow operable by keyboard while the devtools pill's
      // pointer overlap is tracked by a separate fixme regression.
      await increase.focus()
      await page.keyboard.press('Enter')
    } else await increase.click()
  }
  await page
    .getByRole('button', { name: isMobile ? 'Comprar NFT' : 'COMPRAR', exact: true })
    .click()
  await expect(page).toHaveURL(/\/carrinho$/)
}

export async function loginThroughUi(page: Page, user: LoginRequest = users.ana): Promise<void> {
  const form = page.getByRole('form', { name: 'Entrar', exact: true })
  await form.getByRole('textbox', { name: 'E-mail', exact: true }).fill(user.email)
  await form.getByLabel('Senha', { exact: true }).fill(user.password)
  await form.getByRole('button', { name: 'Entrar', exact: true }).click()
}

export async function openReview(page: Page): Promise<Locator> {
  await expect(page.getByRole('button', { name: 'Confirmar compra', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Confirmar compra', exact: true }).click()
  const dialog = reviewDialog(page)
  await expect(dialog).toBeVisible()
  return dialog
}

export async function connectedReview(page: Page): Promise<Locator> {
  const dialog = await openReview(page)
  await expect(dialog.getByText('Carteira conectada', { exact: true })).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Confirmar e pagar', exact: true })).toBeEnabled()
  return dialog
}

export async function currentCart(api: ApiHelpers) {
  const response = await api.get('/cart')
  expect(response.status).toBe(200)
  return cartSchema.parse(response.body)
}

export async function currentQuote(api: ApiHelpers): Promise<Quote> {
  const response = await api.request('POST', '/quotes', { network: 'ethereum' })
  expect(response.status).toBe(201)
  return quoteSchema.parse(response.body)
}

export async function expectCartQuote(page: Page, quote: Quote): Promise<void> {
  const summary = cartSummary(page)
  for (const [label, value] of [
    ['Subtotal', formatEth(quote.subtotal)],
    ['Taxa de rede', formatEth(quote.networkFee)],
    ['Total', formatEth(quote.total)],
  ]) {
    await expect(
      summary.getByText(label!, { exact: true }).locator('..').getByRole('definition'),
    ).toContainText(value!)
  }
}

export async function currentOrder(page: Page, api: ApiHelpers) {
  await expect(page).toHaveURL(/\/pedido\/[^/?]+$/)
  const id = new URL(page.url()).pathname.split('/').at(-1)!
  const response = await api.get(`/orders/${id}`)
  expect(response.status).toBe(200)
  return orderSchema.parse(response.body)
}

export async function expectReceipt(page: Page, api: ApiHelpers) {
  await expect(
    page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira', exact: true }),
  ).toBeVisible()
  const order = await currentOrder(page, api)
  expect(order.status).toBe('confirmed')
  const receipt = page.getByRole('region', {
    name: 'Seus NFTs agora estão na sua carteira',
    exact: true,
  })
  await expect(receipt).toContainText(formatEth(order.total))
  await expect(receipt).toContainText(formatEth(order.networkFee))
  await expect(receipt).toContainText(order.wallet.label)
  await expect(receipt.getByText(order.transaction!.hash, { exact: true })).toBeAttached()
  const date = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).formatToParts(new Date(order.settledAt!))
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    date.find((entry) => entry.type === type)!.value
  const month = part('month').replace('.', '')
  await expect(receipt).toContainText(
    `${part('day')} ${month[0]!.toUpperCase()}${month.slice(1)}, ${part('year')}`,
  )
  for (const item of order.items) {
    const row = receipt.getByRole('row').filter({ has: page.getByText(item.name, { exact: true }) })
    await expect(row).toContainText(item.tokenId)
    await expect(row).toContainText(`(x ${item.quantity})`)
    await expect(row).toContainText(formatEth(item.lineTotal))
  }
  return order
}
