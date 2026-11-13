import { compareEth } from '@/lib/money'
import { expect, test } from './support/fixtures'
import {
  closeFilters,
  expectCatalog,
  market,
  openFilters,
  searchCatalog,
  sortCatalog,
} from './support/pages/catalog'

test('search, combined category/network/price filters and sorting agree with REST', async ({
  app,
  page,
  api,
  isMobile,
}) => {
  await app.goto()
  await searchCatalog(page, isMobile, 'Golden')
  const searched = await expectCatalog(page, api)
  expect(searched.totalItems).toBeGreaterThan(0)
  expect(searched.totalItems).toBeLessThan(54)
  const filters = await openFilters(page, isMobile)
  await filters.getByRole('button', { name: /^Arte digital/ }).click()
  await filters.getByRole('button', { name: /^Música/ }).click()
  await filters.getByRole('button', { name: /^Ethereum/ }).click()
  await filters.getByRole('slider', { name: 'Preço mínimo' }).press('ArrowRight')
  await filters.getByRole('slider', { name: 'Preço máximo' }).press('ArrowLeft')
  await filters.getByRole('button', { name: 'Aplicar', exact: true }).click()
  await closeFilters(page, isMobile)
  const combined = await expectCatalog(page, api)
  expect(combined.items.length).toBeGreaterThan(0)
  const state = new URL(page.url()).searchParams
  expect(state.getAll('categoria')).toEqual(['arte-digital', 'musica'])
  expect(state.getAll('rede')).toEqual(['ethereum'])
  const minimum = state.get('precoMin')!
  const maximum = state.get('precoMax')!
  for (const item of combined.items) {
    expect(['arte-digital', 'musica']).toContain(item.category)
    expect(item.network).toBe('ethereum')
    expect(compareEth(item.price, minimum)).toBeGreaterThanOrEqual(0)
    expect(compareEth(item.price, maximum)).toBeLessThanOrEqual(0)
  }
  for (const [label, direction] of [
    ['Menor preço', 1],
    ['Maior preço', -1],
  ] as const) {
    await sortCatalog(page, label)
    const sorted = await expectCatalog(page, api)
    expect(sorted.items.length).toBeGreaterThan(1)
    for (let index = 1; index < sorted.items.length; index++)
      expect(
        compareEth(sorted.items[index - 1]!.price, sorted.items[index]!.price) * direction,
      ).toBeLessThanOrEqual(0)
    expect(
      compareEth(sorted.items[0]!.price, sorted.items.at(-1)!.price) * direction,
    ).toBeLessThanOrEqual(0)
  }
})

test('pagination changes cards and a filter on page three resets to page one', async ({
  app,
  page,
  api,
  isMobile,
}) => {
  await app.goto()
  const first = await expectCatalog(page, api)
  await market(page).getByRole('link', { name: 'Página 2', exact: true }).click()
  await expect(page).toHaveURL(/pagina=2/)
  const second = await expectCatalog(page, api)
  expect(second.items.map((item) => item.id)).not.toEqual(first.items.map((item) => item.id))
  await market(page).getByRole('link', { name: 'Página 3', exact: true }).click()
  await expectCatalog(page, api)
  const filters = await openFilters(page, isMobile)
  await filters.getByRole('button', { name: /^Ethereum/ }).click()
  await closeFilters(page, isMobile)
  await expect.poll(() => new URL(page.url()).searchParams.has('pagina')).toBe(false)
  expect((await expectCatalog(page, api)).page).toBe(1)
})

test('back, forward, reload and direct deep links restore controls and results', async ({
  app,
  page,
  api,
  isMobile,
}) => {
  await app.goto()
  await expectCatalog(page, api)
  const states: string[] = [page.url()]
  await searchCatalog(page, isMobile, 'a')
  await expectCatalog(page, api)
  states.push(page.url())
  const filters = await openFilters(page, isMobile)
  await filters.getByRole('button', { name: /^Ethereum/ }).click()
  await closeFilters(page, isMobile)
  await expectCatalog(page, api)
  states.push(page.url())
  await sortCatalog(page, 'Menor preço')
  await expectCatalog(page, api)
  states.push(page.url())
  await market(page).getByRole('link', { name: 'Página 2', exact: true }).click()
  await expectCatalog(page, api)
  states.push(page.url())

  const assertState = async (url: string) => {
    await expect(page).toHaveURL(url)
    await expectCatalog(page, api)
    const params = new URL(url).searchParams
    if (isMobile)
      await expect(page.getByRole('searchbox', { name: 'Explorar coleções' })).toHaveValue(
        params.get('q') ?? '',
      )
    const panel = await openFilters(page, isMobile)
    await expect(panel.getByRole('button', { name: /^Ethereum/ })).toHaveAttribute(
      'aria-pressed',
      String(params.has('rede')),
    )
    await closeFilters(page, isMobile)
    await market(page).getByRole('combobox', { name: 'Ordenar por' }).click()
    await expect(
      page.getByRole('option', {
        name: params.has('ordem') ? 'Menor preço' : 'Listados recentemente',
        exact: true,
      }),
    ).toHaveAttribute('aria-selected', 'true')
    await page.keyboard.press('Escape')
    await expect(
      market(page).getByRole('link', {
        name: `Página ${params.get('pagina') ?? '1'}`,
        exact: true,
      }),
    ).toHaveAttribute('aria-current', 'page')
  }
  for (const url of states.slice(0, -1).reverse()) {
    await page.goBack()
    await assertState(url)
  }
  for (const url of states.slice(1)) {
    await page.goForward()
    await assertState(url)
  }
  await page.reload()
  await app.ready()
  await assertState(states.at(-1)!)
  await app.goto(
    '/?categoria=arte-digital&categoria=musica&rede=ethereum&precoMin=0.03&precoMax=12&aba=em-alta&ordem=preco-desc',
  )
  await expectCatalog(page, api)
  await expect(market(page).getByRole('tab', { name: 'Em alta', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  const deepFilters = await openFilters(page, isMobile)
  for (const label of [/^Arte digital/, /^Música/, /^Ethereum/])
    await expect(deepFilters.getByRole('button', { name: label })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  await expect(deepFilters.getByRole('slider', { name: 'Preço mínimo' })).toHaveAttribute(
    'aria-valuenow',
    '3',
  )
  await expect(deepFilters.getByRole('slider', { name: 'Preço máximo' })).toHaveAttribute(
    'aria-valuenow',
    '1200',
  )
  await closeFilters(page, isMobile)
  await market(page).getByRole('combobox', { name: 'Ordenar por' }).click()
  await expect(page.getByRole('option', { name: 'Maior preço', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  )
})

test('an empty search can be cleared', async ({ app, page, api, isMobile }) => {
  await app.goto()
  await searchCatalog(page, isMobile, 'no-such-kurio-collection-987')
  await expect(market(page).getByRole('heading', { name: 'Nenhum NFT encontrado' })).toBeVisible()
  expect(
    (await api.get<{ items: unknown[] }>('/nfts?q=no-such-kurio-collection-987')).body.items,
  ).toEqual([])
  await market(page).getByRole('button', { name: 'Limpar filtros', exact: true }).click()
  await expect.poll(() => new URL(page.url()).search).toBe('')
  expect((await expectCatalog(page, api)).totalItems).toBe(54)
})

test('invalid URL parameters are ignored without an error', async ({ app, page, api }) => {
  await app.goto('/?pagina=abc&categoria=nope&ordem=x')
  expect((await expectCatalog(page, api, '/nfts')).page).toBe(1)
  await expect(market(page).getByRole('alert')).toHaveCount(0)
})

test('out-of-order searches keep the most recent results', async ({
  app,
  page,
  api,
  mocks,
  isMobile,
}) => {
  await app.goto()
  await expectCatalog(page, api)
  await mocks.setScenario('out-of-order')
  const firstRequest = page.waitForRequest(
    (request) => new URL(request.url()).searchParams.get('q') === 'Golden',
  )
  await searchCatalog(page, isMobile, 'Golden')
  await firstRequest
  await searchCatalog(page, isMobile, 'Emerald')
  await expectCatalog(page, api)
  await page.clock.runFor(1700)
  await expectCatalog(page, api)
  expect(new URL(page.url()).searchParams.get('q')).toBe('Emerald')
})
