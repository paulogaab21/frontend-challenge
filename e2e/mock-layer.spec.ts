import {
  apiErrorSchema,
  cartSchema,
  favoritesResponseSchema,
  nftDetailSchema,
  nftListResponseSchema,
  orderSchema,
  quoteSchema,
  quoteStaleDetailsSchema,
  sessionSchema,
  walletConnectionSchema,
  type CreateOrderInput,
} from '@/contracts'

import { anaCollector, anaWallet, coupons, FIXED_NOW, NFT_IDS, users } from './support/data'
import { expect, test, type ApiHelpers } from './support/fixtures'

/** Only arranges the simulated server; page-level purchase flows must use the UI. */
async function checkoutInput(api: ApiHelpers): Promise<CreateOrderInput> {
  const connectionResponse = await api.request('POST', '/wallet-connections', {
    walletId: anaWallet.id,
    address: anaWallet.address,
    provider: anaWallet.provider,
    network: anaWallet.network,
  })
  expect(connectionResponse.status).toBe(201)
  const connection = walletConnectionSchema.parse(connectionResponse.body)
  const quoteResponse = await api.request('POST', '/quotes', { network: anaWallet.network })
  expect(quoteResponse.status).toBe(201)
  const quote = quoteSchema.parse(quoteResponse.body)
  expect(quote.purchasable).toBe(true)
  return {
    quoteId: quote.id,
    quoteFingerprint: quote.fingerprint,
    walletId: anaWallet.id,
    connectionId: connection.id,
    collector: anaCollector,
  }
}

test('REST is answered by MSW with combined filters, sorting, pagination and consistent facets', async ({
  app,
  api,
  page,
}) => {
  await app.goto()
  const filters =
    '/nfts?q=Golden&collection=kurio-apes&category=musica&category=arte-digital&network=ethereum&network=polygon&priceMin=0.39&priceMax=0.99&sort=preco-asc&pageSize=1'
  const intercepted = page.waitForResponse((response) => {
    const url = new URL(response.url())
    return url.pathname === '/api/nfts' && url.searchParams.get('q') === 'Golden'
  })
  const firstResponse = await api.get(`${filters}&page=1`)
  expect((await intercepted).fromServiceWorker()).toBe(true)
  expect(firstResponse.status).toBe(200)
  const first = nftListResponseSchema.parse(firstResponse.body)
  const second = nftListResponseSchema.parse((await api.get(`${filters}&page=2`)).body)
  expect(first).toMatchObject({ page: 1, pageSize: 1, totalItems: 2, totalPages: 2 })
  expect(second).toMatchObject({ page: 2, pageSize: 1, totalItems: 2, totalPages: 2 })
  expect(first.items.map((item) => item.id)).toEqual([NFT_IDS.goldenSignal])
  expect(second.items.map((item) => item.id)).toEqual([NFT_IDS.goldenBeat])
  expect(first.facets).toEqual(second.facets)
  expect(first.facets.categories.find((facet) => facet.id === 'musica')?.count).toBe(2)
  expect(first.facets.categories.reduce((sum, facet) => sum + facet.count, 0)).toBe(2)
  expect(first.facets.networks.find((facet) => facet.id === 'ethereum')?.count).toBe(2)
  expect(first.facets.price).toEqual({ min: '0.02', max: '12.3' })
  const descending = nftListResponseSchema.parse(
    (await api.get(filters.replace('preco-asc', 'preco-desc'))).body,
  )
  expect(descending.items[0]?.id).toBe(NFT_IDS.goldenBeat)

  const missing = await api.get('/nfts/does-not-exist')
  expect(missing.status).toBe(404)
  expect(apiErrorSchema.parse(missing.body)).toMatchObject({
    code: 'NOT_FOUND',
    requestId: missing.headers['x-request-id'],
  })
  const unauthorized = await api.get('/favorites')
  expect(unauthorized.status).toBe(401)
  expect(apiErrorSchema.parse(unauthorized.body).code).toBe('UNAUTHENTICATED')
})

test('scenario switching deterministically restarts flaky failures, supports empty catalog and rejects offline requests', async ({
  app,
  api,
  mocks,
}) => {
  await app.goto()
  for (let repetition = 0; repetition < 2; repetition++) {
    await mocks.setScenario('flaky-catalog')
    const statuses: number[] = []
    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await api.get('/nfts')
      statuses.push(response.status)
      if (attempt < 2) expect(apiErrorSchema.parse(response.body).code).toBe('SERVICE_UNAVAILABLE')
      else expect(nftListResponseSchema.parse(response.body).totalItems).toBe(54)
    }
    expect(statuses).toEqual([503, 503, 200])
  }
  await mocks.setScenario('empty-catalog')
  const empty = nftListResponseSchema.parse((await api.get('/nfts')).body)
  expect(empty).toMatchObject({ items: [], totalItems: 0, totalPages: 0 })
  expect(empty.facets.categories.every((facet) => facet.count === 0)).toBe(true)
  await mocks.setScenario('offline')
  await expect(api.get('/nfts')).rejects.toThrow(/fetch|network/i)
})

test('reset removes mutations, carts, favorites changes, registered users and all server sessions', async ({
  app,
  api,
  mocks,
}) => {
  await app.goto()
  // The mounted application has already asked for its visitor cart, so the state
  // at this point is no longer the seed. The reference is the known scenario
  // itself: what a reset produces before anything else happens.
  await mocks.reset()
  const seed = await mocks.snapshot()
  expect(seed.carts).toEqual({})
  await mocks.setPrice(NFT_IDS.emeraldApe, '9.99')
  await api.addToCart(NFT_IDS.emeraldApe, 'fifty', 2)
  await api.request('PUT', '/cart/coupon', { code: coupons.percentage })
  await api.login(users.ana)
  const favorite = await api.request('PUT', `/favorites/${NFT_IDS.emeraldApe}`)
  expect(favorite.status).toBe(200)
  expect(favoritesResponseSchema.parse(favorite.body).items.map((item) => item.id)).toContain(
    NFT_IDS.emeraldApe,
  )
  const registration = await api.request('POST', '/users', {
    username: 'seapen.reset',
    email: 'reset@kurio.test',
    password: 'Reset@2026',
  })
  expect(registration.status).toBe(201)
  const registered = sessionSchema.parse(registration.body)
  const changed = await mocks.snapshot()
  expect(changed.users[registered.user.id]).toBeDefined()
  expect(Object.keys(changed.sessions)).toHaveLength(2)
  expect(Object.values(changed.carts).some((cart) => cart.lines.length > 0)).toBe(true)

  await mocks.reset()
  const restored = await mocks.snapshot()
  expect(restored).toMatchObject({
    nfts: seed.nfts,
    nftOrder: seed.nftOrder,
    users: seed.users,
    favorites: seed.favorites,
    wallets: seed.wallets,
    fees: seed.fees,
    counters: seed.counters,
    orders: seed.orders,
    carts: {},
    sessions: {},
    quotes: {},
    connections: {},
    idempotency: {},
    eventVersions: {},
  })
  expect(Object.keys(restored.users)).toHaveLength(2)
  expect(Object.keys(restored.carts)).toHaveLength(0)
  expect(Object.keys(restored.sessions)).toHaveLength(0)
  expect(Object.keys(restored.quotes)).toHaveLength(0)
  expect(restored.coupons[coupons.temporary]?.expiresAt).toBe(
    new Date(restored.seededAt + 2 * 3_600_000).toISOString(),
  )
  expect((await mocks.config()).scenario).toBe('default')
  expect(await mocks.events()).toEqual([])
  const expired = await api.get('/session')
  expect(expired.status).toBe(401)
  expect(apiErrorSchema.parse(expired.body).code).toBe('SESSION_EXPIRED')
})

test('order retries replay one order and reject a changed body under the same idempotency key', async ({
  app,
  api,
  mocks,
}) => {
  await app.goto('/', { scenario: 'payment-pending' })
  await api.login(users.ana)
  await api.addToCart(NFT_IDS.emeraldApe, 'fifty', 2)
  const body = await checkoutInput(api)
  const headers = { 'Idempotency-Key': 'seapen-idempotent-order' }
  const first = await api.request('POST', '/orders', body, headers)
  expect(first.status).toBe(201)
  const order = orderSchema.parse(first.body)
  expect(order.status).toBe('pending')
  const replay = await api.request('POST', '/orders', body, headers)
  expect(replay.status).toBe(200)
  expect(replay.headers['idempotent-replayed']).toBe('true')
  expect(orderSchema.parse(replay.body)).toEqual(order)
  expect(await mocks.pendingOrders()).toEqual([order.id])
  const conflict = await api.request(
    'POST',
    '/orders',
    { ...body, collector: { ...body.collector, note: 'Different request' } },
    headers,
  )
  expect(conflict.status).toBe(409)
  expect(apiErrorSchema.parse(conflict.body).code).toBe('IDEMPOTENCY_KEY_REUSED')
})

test('a stale checkout quote returns the fresh quote and creates no order', async ({
  app,
  api,
  mocks,
}) => {
  await app.goto('/', { scenario: 'payment-pending' })
  await api.login(users.ana)
  await api.addToCart(NFT_IDS.emeraldApe, 'fifty', 2)
  const body = await checkoutInput(api)
  await mocks.setPrice(NFT_IDS.emeraldApe, '1.29', 'fifty')
  const response = await api.request('POST', '/orders', body, {
    'Idempotency-Key': 'seapen-stale-quote',
  })
  expect(response.status).toBe(409)
  const problem = apiErrorSchema.parse(response.body)
  expect(problem.code).toBe('QUOTE_STALE')
  const { quote } = quoteStaleDetailsSchema.parse(problem.details)
  expect(quote.fingerprint).not.toBe(body.quoteFingerprint)
  expect(quote).toMatchObject({
    subtotal: '2.58',
    networkFee: '0.016',
    total: '2.596',
    purchasable: true,
  })
  expect(quote.issues.some((issue) => issue.type === 'price_changed')).toBe(true)
  expect(await mocks.pendingOrders()).toEqual([])
})

test('a price update agrees between the REST detail and exactly one versioned event', async ({
  app,
  api,
  mocks,
}) => {
  await app.goto()
  const original = nftDetailSchema.parse((await api.get(`/nfts/${NFT_IDS.emeraldApe}`)).body)
  await mocks.setPrice(NFT_IDS.emeraldApe, '1.29')
  const updated = nftDetailSchema.parse((await api.get(`/nfts/${NFT_IDS.emeraldApe}`)).body)
  expect(updated.price).toBe('1.29')
  expect(updated.version).toBe(original.version + 1)
  const events = await mocks.events()
  expect(events).toHaveLength(1)
  expect(events[0]).toMatchObject({
    type: 'nft.updated',
    resource: { type: 'nft', id: original.id },
    version: updated.version,
    data: { price: updated.price, previousPrice: original.price },
  })
})

test('guest cart, user session and manually settled pending order survive reloads', async ({
  app,
  api,
  mocks,
  page,
}) => {
  await app.goto('/', { scenario: 'payment-pending' })
  const before = await page.evaluate(() => Date.now())
  expect(before).toBeGreaterThanOrEqual(Date.parse(FIXED_NOW))
  expect(before).toBeLessThan(Date.parse(FIXED_NOW) + 60_000)
  await page.clock.fastForward(60_000)
  expect(await page.evaluate(() => Date.now())).toBeGreaterThanOrEqual(before + 60_000)
  const cart = await api.addToCart(NFT_IDS.emeraldApe, 'fifty', 2)
  const token = await page.evaluate(() => localStorage.getItem('kurio.cart-token'))
  await page.reload()
  await app.ready()
  expect(cartSchema.parse((await api.get('/cart')).body).items).toEqual(cart.items)
  expect(await page.evaluate(() => localStorage.getItem('kurio.cart-token'))).toBe(token)

  const session = await api.login(users.ana)
  expect(await page.evaluate(() => localStorage.getItem('kurio.cart-token'))).toBeNull()
  expect(cartSchema.parse((await api.get('/cart')).body).items).toEqual(cart.items)
  const body = await checkoutInput(api)
  const created = await api.request('POST', '/orders', body, {
    'Idempotency-Key': 'seapen-persist-order',
  })
  expect(created.status).toBe(201)
  const order = orderSchema.parse(created.body)
  await page.reload()
  await app.ready()
  expect(sessionSchema.parse((await api.get('/session')).body).token).toBe(session.token)
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('kurio.session') ?? 'null')),
  ).toEqual({ token: session.token, userId: session.user.id, expiresAt: session.expiresAt })
  expect(orderSchema.parse((await api.get(`/orders/${order.id}`)).body).status).toBe('pending')
  expect(await mocks.pendingOrders()).toEqual([order.id])
  await mocks.settleOrder(order.id, 'confirmed')
  const settled = orderSchema.parse((await api.get(`/orders/${order.id}`)).body)
  expect(settled).toMatchObject({ status: 'confirmed', version: order.version + 1 })
  expect(settled.transaction?.hash).toMatch(/^0x[0-9a-f]{64}$/)
  expect(cartSchema.parse((await api.get('/cart')).body).items).toEqual([])
  await page.reload()
  await app.ready()
  expect(orderSchema.parse((await api.get(`/orders/${order.id}`)).body)).toEqual(settled)
})
