import { expect, test } from './support/fixtures'
import { coupons, NFT_IDS } from './support/data'
import {
  buyDetail,
  cartLine,
  cartSummary,
  currentCart,
  currentQuote,
  expectCartQuote,
  loginThroughUi,
} from './support/purchase-page'
import { formatEth } from '@/lib/money'

test('mobile detail quantity increase remains reachable by pointer', async ({
  app,
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'Only the mobile layout has the fixed purchase bar.')
  await app.goto(`/nft/${NFT_IDS.emeraldApe}`)
  await page
    .getByRole('button', { name: 'Aumentar quantidade', exact: true })
    .filter({ visible: true })
    .click()
  await buyDetail(page, isMobile)
  await expect(cartLine(page, 'Emerald Ape #042', true)).toContainText('2.38 ETH')
})

test('chosen editions and quantities add, accumulate and remain separate cart lines', async ({
  app,
  page,
  api,
  isMobile,
}) => {
  await app.goto(`/nft/${NFT_IDS.emeraldApe}`)
  await buyDetail(page, isMobile, '1/50', 2)
  await expect(cartLine(page, 'Emerald Ape #042', isMobile)).toContainText('1/50')
  // The cart's mobile top bar intentionally has no badge; the catalog tab bar does.
  if (isMobile) await page.getByRole('link', { name: 'Voltar', exact: true }).click()
  await expect(
    page.getByRole('link', { name: 'Carrinho, 2 itens', exact: true }).filter({ visible: true }),
  ).toBeVisible()
  await page.goto(`/nft/${NFT_IDS.emeraldApe}`)
  await buyDetail(page, isMobile, '1/50', 1)
  expect((await currentCart(api)).items[0]?.quantity).toBe(3)
  await page.goto(`/nft/${NFT_IDS.emeraldApe}`)
  await buyDetail(page, isMobile, '1/10', 1)
  const cart = await currentCart(api)
  expect(cart.items.map(({ editionId, quantity }) => [editionId, quantity])).toEqual([
    ['fifty', 3],
    ['ten', 1],
  ])
  await expect(cartLine(page, 'Emerald Ape #042', isMobile)).toHaveCount(2)
  await expect(
    cartLine(page, 'Emerald Ape #042', isMobile).filter({ hasText: '1/10' }),
  ).toContainText('2.975 ETH')
})

test('steppers update the quote, enforce available stock and forbid a sold-out edition', async ({
  app,
  page,
  api,
  isMobile,
}) => {
  await app.goto(`/nft/${NFT_IDS.emeraldApe}`)
  await expect(page.getByRole('radio', { name: '1/1, esgotada', exact: true })).toBeDisabled()
  await page.goto(`/nft/${NFT_IDS.goldenFrequency}`)
  await buyDetail(page, isMobile, '1/50', 2)
  const line = cartLine(page, 'Golden Frequency #071', isMobile)
  await line.getByRole('button', { name: 'Aumentar quantidade de Golden Frequency #071' }).click()
  await expect(
    line.getByRole('button', { name: 'Aumentar quantidade de Golden Frequency #071' }),
  ).toBeDisabled()
  await expect(line.getByText('Máximo disponível', { exact: true })).toBeVisible()
  await expect.poll(async () => (await currentCart(api)).items[0]?.quantity).toBe(3)
  await expect(line).toContainText('1.77 ETH')
  await expectCartQuote(page, await currentQuote(api))
  await line.getByRole('button', { name: 'Diminuir quantidade de Golden Frequency #071' }).click()
  await expect.poll(async () => (await currentCart(api)).items[0]?.quantity).toBe(2)
  await expectCartQuote(page, await currentQuote(api))
})

test('removing the last line shows the empty cart and empties the server cart', async ({
  app,
  page,
  api,
  isMobile,
}) => {
  await app.goto(`/nft/${NFT_IDS.emeraldApe}`)
  await buyDetail(page, isMobile)
  await cartLine(page, 'Emerald Ape #042', isMobile)
    .getByRole('button', { name: 'Remover Emerald Ape #042 do carrinho' })
    .click()
  await expect(page.getByRole('heading', { name: 'Seu carrinho está vazio' })).toBeVisible()
  expect((await currentCart(api)).items).toEqual([])
})

test('coupon validation is tied to the field, then a valid coupon prices and can be removed', async ({
  app,
  page,
  api,
  isMobile,
}) => {
  await app.goto(`/nft/${NFT_IDS.emeraldApe}`)
  await buyDetail(page, isMobile, '1/50', 2)
  const summary = cartSummary(page)
  const field = summary.getByRole('textbox', { name: 'Código promocional' })
  for (const [code, error] of [
    ['INVALIDO', 'Código promocional inválido.'],
    [coupons.expired, 'Este código promocional expirou.'],
  ]) {
    await field.fill(code!)
    await summary.getByRole('button', { name: 'Aplicar', exact: true }).click()
    await expect(field).toHaveAttribute('aria-invalid', 'true')
    await expect(field).toHaveAccessibleDescription(error!)
    await expect(summary.getByRole('alert')).toHaveText(error!)
  }
  await field.fill(coupons.percentage)
  await field.press('Enter')
  await expect(summary).toContainText('Cupom KURIO10 aplicado')
  const quote = await currentQuote(api)
  expect(quote.discount).toBe('0.238')
  await expectCartQuote(page, quote)
  await expect(summary).toContainText(`(-) ${formatEth(quote.discount)}`)
  await summary.getByRole('button', { name: 'Remover', exact: true }).click()
  await expect(summary).not.toContainText('Cupom KURIO10 aplicado')
  expect((await currentQuote(api)).discount).toBe('0')
  await expect(summary).toContainText('(-) 00.00')
})

test('visitor cart survives reload and UI login adopts the same lines into the account', async ({
  app,
  page,
  api,
  isMobile,
}) => {
  await app.goto(`/nft/${NFT_IDS.emeraldApe}`)
  await buyDetail(page, isMobile, '1/50', 2)
  const before = await currentCart(api)
  await page.reload()
  await app.ready()
  await expect(cartLine(page, 'Emerald Ape #042', isMobile)).toContainText('2.38 ETH')
  await cartSummary(page).getByRole('link', { name: 'Conectar e finalizar' }).click()
  await expect(page).toHaveURL(/\/entrar\?redirect=/)
  await loginThroughUi(page)
  await expect(page).toHaveURL(/\/pagamento$/)
  expect((await currentCart(api)).items).toEqual(before.items)
  await page.goto('/carrinho')
  await expect(cartLine(page, 'Emerald Ape #042', isMobile)).toContainText('2.38 ETH')
})
