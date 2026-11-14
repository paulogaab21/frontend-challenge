import { NFT_IDS, users } from './support/data'
import {
  expect,
  expectElementScreenshot,
  expectNoHorizontalOverflow,
  expectScreenshot,
  prepareScreenshot,
  test,
} from './support/fixtures'
import { cartSummary, currentQuote, expectCartQuote, gotoPage } from './support/purchase-page'

test('home and its catalog section match their visual baselines', async ({ app, page }) => {
  await app.goto('/', { scenario: 'default' })
  const firstSlide = page.getByRole('button', { name: 'Ir para o destaque 1', exact: true })
  await firstSlide.click()
  await expect(firstSlide).toHaveAttribute('aria-current', 'true')
  const catalog = page.getByRole('region', { name: 'Mercado de NFTs', exact: true })
  await expect(catalog.getByRole('article').first()).toBeVisible()
  await expectNoHorizontalOverflow(page)
  await expectScreenshot(page, 'home.png', { fullPage: true })
  await expectElementScreenshot(page, catalog, 'home-catalog.png')
})

test('NFT detail matches its visual baseline', async ({ app, page }) => {
  await app.goto(`/nft/${NFT_IDS.emeraldApe}?edicao=fifty`, { scenario: 'default' })
  await expect(page.getByRole('heading', { name: 'Emerald Ape #042', exact: true })).toBeVisible()
  await expect(page.getByRole('radio', { name: '1/50', exact: true })).toBeChecked()
  await expectNoHorizontalOverflow(page)
  await expectScreenshot(page, 'nft-detail.png', { fullPage: true })
})

test('populated cart matches its visual baseline', async ({ app, api, page }) => {
  await app.goto('/', { scenario: 'default' })
  await api.addToCart(NFT_IDS.emeraldApe, 'fifty', 2)
  await api.addToCart(NFT_IDS.violetNomad, 'fifty', 6)
  await api.addToCart(NFT_IDS.ivoryBaron, 'fifty', 9)
  await gotoPage(page, '/carrinho')
  await expect(cartSummary(page)).toBeVisible()
  await expectCartQuote(page, await currentQuote(api))
  await expectNoHorizontalOverflow(page)
  await expectScreenshot(page, 'cart.png', { fullPage: true })
})

test('payment matches its visual baseline', async ({ app, api, page }) => {
  await app.goto('/', { scenario: 'default' })
  await api.login(users.ana)
  await api.addToCart(NFT_IDS.emeraldApe, 'fifty', 2)
  await gotoPage(page, '/pagamento')
  await expect(page.getByRole('button', { name: 'Confirmar compra', exact: true })).toBeEnabled()
  await expectNoHorizontalOverflow(page)
  await expectScreenshot(page, 'payment.png', { fullPage: true })
})

test('tablet pages fit at the desktop-shell breakpoint', async ({ app, api, page, isMobile }) => {
  test.skip(isMobile, 'The tablet check uses the desktop context at 768px.')
  await page.setViewportSize({ width: 768, height: 1024 })
  await app.goto('/', { scenario: 'default' })
  await api.login(users.ana)
  await api.addToCart(NFT_IDS.emeraldApe, 'fifty', 2)
  for (const [name, path] of [
    ['home', '/'],
    ['detail', `/nft/${NFT_IDS.emeraldApe}?edicao=fifty`],
    ['cart', '/carrinho'],
    ['payment', '/pagamento'],
  ]) {
    await gotoPage(page, path!)
    await expectNoHorizontalOverflow(page)
    await prepareScreenshot(page, true)
    await test.info().attach(`tablet-${name}`, {
      contentType: 'image/png',
      body: await page.screenshot({
        fullPage: true,
        animations: 'disabled',
        caret: 'hide',
        style: '[data-mock-devtools] { visibility: hidden !important; }',
      }),
    })
  }
})
