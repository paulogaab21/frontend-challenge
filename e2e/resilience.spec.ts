import { cartSchema, nftDetailSchema } from '@/contracts'
import { addEth, formatEth } from '@/lib/money'
import { NFT_IDS } from './support/data'
import { expect, test } from './support/fixtures'
import { expectCatalog, market } from './support/pages/catalog'
import { expectSameBox, layoutShiftScore, observeLayoutShifts } from './support/pages/performance'

test('slow catalog reserves its grid and filters without layout shift', async ({
  app,
  page,
  api,
  isMobile,
}, testInfo) => {
  await observeLayoutShifts(page)
  await app.goto('/', { scenario: 'slow-network' })
  await expect(page.getByRole('status', { name: 'Carregando NFTs', exact: true })).toBeVisible()
  const grid = market(page).getByRole('list').first()
  const gridBox = await grid.boundingBox()
  expect(gridBox).not.toBeNull()
  const filters = page.getByRole('status', { name: 'Carregando filtros', exact: true })
  const filterBox = !isMobile ? await filters.boundingBox() : null
  if (!isMobile) await expect(filters).toBeVisible()
  await expect(market(page).getByRole('article')).toHaveCount(9)
  await expectSameBox(gridBox!, grid)
  if (filterBox)
    await expectSameBox(filterBox, page.getByRole('complementary', { name: 'Filtros do catálogo' }))
  const cls = await layoutShiftScore(page)
  await testInfo.attach('catalog-layout', {
    body: JSON.stringify({ gridBox, loaded: await grid.boundingBox(), cls }),
    contentType: 'application/json',
  })
  expect(cls).toBeLessThanOrEqual(0.01)
  await expectCatalog(page, api)
})

test('slow detail shows its skeleton and replaces it without layout shift', async ({
  app,
  page,
  api,
}, testInfo) => {
  await observeLayoutShifts(page)
  await app.goto(`/nft/${NFT_IDS.emeraldApe}`, { scenario: 'slow-network' })
  const skeleton = page.getByRole('status', { name: 'Carregando NFT', exact: true })
  await expect(skeleton).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Emerald Ape #042', level: 1, exact: true }),
  ).toBeVisible()
  await expect(skeleton).toHaveCount(0)
  const cls = await layoutShiftScore(page)
  await testInfo.attach('detail-layout', {
    body: JSON.stringify({ cls }),
    contentType: 'application/json',
  })
  expect(cls).toBeLessThanOrEqual(0.01)
  const nft = nftDetailSchema.parse((await api.get(`/nfts/${NFT_IDS.emeraldApe}`)).body)
  await expect(
    page.getByRole('radio', {
      name: nft.editions.find((edition) => edition.id === nft.defaultEditionId)!.label,
      exact: true,
    }),
  ).toBeChecked()
})

test('slow cart summary keeps its reserved space while the quote loads', async ({
  app,
  page,
  api,
  mocks,
}, testInfo) => {
  await app.goto()
  await api.addToCart(NFT_IDS.emeraldApe, 'fifty')
  await api.addToCart(NFT_IDS.neonVessel, 'fifty')
  await api.addToCart(NFT_IDS.goldenBeat, 'fifty')
  await observeLayoutShifts(page)
  await mocks.setScenario('slow-network')
  await app.goto('/carrinho')
  const summary = page.getByRole('region', { name: 'Resumo da carteira', exact: true })
  await expect(summary).toHaveAttribute('aria-busy', 'true')
  const before = await summary.boundingBox()
  expect(before).not.toBeNull()
  await expect(summary).not.toHaveAttribute('aria-busy', 'true')
  await expectSameBox(before!, summary)
  const cls = await layoutShiftScore(page)
  await testInfo.attach('cart-layout', {
    body: JSON.stringify({ before, after: await summary.boundingBox(), cls }),
    contentType: 'application/json',
  })
  expect(cls).toBeLessThanOrEqual(0.01)
  const cart = cartSchema.parse((await api.get('/cart')).body)
  expect(cart.items).toHaveLength(3)
  await expect(summary.getByRole('button', { name: 'Aplicar', exact: true })).toBeEnabled()
  await expect(summary).toContainText(
    formatEth(addEth(...cart.items.map((item) => item.lineTotal))),
  )
})

test('server error is explicit and retry recovers once the backend is healthy', async ({
  app,
  page,
  api,
  mocks,
}) => {
  await app.goto('/', { scenario: 'server-error' })
  const error = market(page).getByRole('alert')
  await expect(
    error.getByRole('heading', { name: 'Não foi possível carregar os NFTs' }),
  ).toBeVisible()
  expect((await api.get('/nfts')).status).toBe(500)
  await mocks.setScenario('default')
  await error.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
  await expectCatalog(page, api)
  await expect(error).toHaveCount(0)
})

test('flaky catalog retries one transient failure automatically and the explicit retry is request three', async ({
  app,
  page,
  api,
}) => {
  const statuses: number[] = []
  page.on('response', (response) => {
    if (new URL(response.url()).pathname === '/api/nfts') statuses.push(response.status())
  })
  await app.goto('/', { scenario: 'flaky-catalog' })
  await expect.poll(() => statuses).toEqual([503])
  await page.clock.runFor(1100)
  const error = market(page).getByRole('alert')
  await expect(error).toBeVisible()
  expect(statuses).toEqual([503, 503])
  await error.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
  await expect(market(page).getByRole('article')).toHaveCount(9)
  expect(statuses).toEqual([503, 503, 200])
  await expectCatalog(page, api)
})

test('offline catalog and detail explain connection failure and recover in place', async ({
  app,
  page,
  api,
  mocks,
}) => {
  await app.goto('/', { scenario: 'offline' })
  const catalogError = market(page).getByRole('alert')
  await expect(catalogError).toContainText(
    'Não foi possível conectar ao servidor. Verifique sua conexão.',
  )
  await expect(api.get('/nfts')).rejects.toThrow(/fetch|network/i)
  await mocks.setScenario('default')
  await catalogError.getByRole('button', { name: 'Tentar novamente' }).click()
  await expectCatalog(page, api)
  await mocks.setScenario('offline')
  await app.goto(`/nft/${NFT_IDS.emeraldApe}`)
  const detailError = page.getByRole('main').getByRole('alert')
  await expect(detailError).toContainText(
    'Não foi possível conectar ao servidor. Verifique sua conexão.',
  )
  await expect(api.get(`/nfts/${NFT_IDS.emeraldApe}`)).rejects.toThrow(/fetch|network/i)
  await mocks.setScenario('default')
  await detailError.getByRole('button', { name: 'Tentar novamente' }).click()
  const nft = nftDetailSchema.parse((await api.get(`/nfts/${NFT_IDS.emeraldApe}`)).body)
  await expect(page.getByRole('heading', { name: nft.name, level: 1, exact: true })).toBeVisible()
  await expect(detailError).toHaveCount(0)
})

test('timeout aborts after 15 seconds per attempt, then offers a working retry', async ({
  app,
  page,
  api,
  mocks,
}) => {
  const requests: string[] = []
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/nfts') requests.push(request.url())
  })
  await app.goto('/', { scenario: 'timeout' })
  await expect(page.getByRole('status', { name: 'Carregando NFTs', exact: true })).toBeVisible()
  await expect.poll(() => requests.length).toBe(1)
  await page.clock.fastForward(15_001)
  await page.clock.runFor(1100)
  await expect.poll(() => requests.length).toBe(2)
  await page.clock.fastForward(15_001)
  const error = market(page).getByRole('alert')
  await expect(error).toContainText('O servidor demorou para responder. Tente novamente.')
  expect((await mocks.snapshot()).nftOrder).toHaveLength(54)
  expect((await mocks.config()).scenario).toBe('timeout')
  await mocks.setScenario('default')
  await error.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
  await expectCatalog(page, api)
})

test('failed background refresh preserves cards and offers inline recovery', async ({
  app,
  page,
  api,
  mocks,
}) => {
  await app.goto()
  const before = await expectCatalog(page, api)
  await page.clock.fastForward(31_000)
  await mocks.setScenario('server-error')
  await page.evaluate(() => window.dispatchEvent(new Event('visibilitychange')))
  const notice = market(page).getByRole('alert')
  await expect(notice).toContainText('Não foi possível atualizar o catálogo')
  await expect(market(page).getByRole('heading', { level: 2 })).toHaveText(
    before.items.map((item) => item.name),
  )
  expect((await api.get('/nfts')).status).toBe(500)
  await mocks.setScenario('default')
  await notice.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
  await expect(notice).toHaveCount(0)
  expect((await expectCatalog(page, api)).items).toEqual(before.items)
})
