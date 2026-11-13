import { nftDetailSchema, orderSchema } from '@/contracts'

import { NFT_IDS, users } from './support/data'
import { expect, test } from './support/fixtures'
import {
  buyDetail,
  cartSummary,
  connectedReview,
  currentCart,
  currentOrder,
  expectReceipt,
  loginThroughUi,
} from './support/purchase-page'

test('visitor buys from catalog through UI login, receives an exact receipt snapshot and opens the simulated explorer', async ({
  app,
  page,
  api,
  mocks,
  isMobile,
}) => {
  await app.goto('/')
  const card = page
    .getByRole('article')
    .filter({ has: page.getByRole('heading', { name: 'Emerald Ape #042', exact: true }) })
    .first()
  await card.getByRole('link').first().click()
  await expect(page.getByRole('heading', { name: 'Emerald Ape #042', exact: true })).toBeVisible()
  const before = nftDetailSchema.parse((await api.get(`/nfts/${NFT_IDS.emeraldApe}`)).body)
  await buyDetail(page, isMobile, '1/50', 2)
  await cartSummary(page).getByRole('link', { name: 'Conectar e finalizar' }).click()
  await expect(page).toHaveURL(/\/entrar\?redirect=/)
  await loginThroughUi(page)
  await expect(page).toHaveURL(/\/pagamento$/)
  const dialog = await connectedReview(page)
  const createdResponse = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname === '/api/orders' &&
      response.status() === 201,
  )
  await dialog.getByRole('button', { name: 'Confirmar e pagar', exact: true }).click()
  const created = orderSchema.parse(await (await createdResponse).json())
  const receipt = await expectReceipt(page, api)
  expect(receipt.id).toBe(created.id)
  expect(receipt.items).toEqual(created.items)
  expect((await currentCart(api)).items).toEqual([])
  const after = nftDetailSchema.parse((await api.get(`/nfts/${NFT_IDS.emeraldApe}`)).body)
  expect(after.editions.find((edition) => edition.id === 'fifty')!.available).toBe(
    before.editions.find((edition) => edition.id === 'fifty')!.available - 2,
  )
  await mocks.setPrice(NFT_IDS.emeraldApe, '9.99')
  await page.reload()
  await app.ready()
  expect(await expectReceipt(page, api)).toEqual(receipt)
  await page.getByRole('link', { name: 'Ver no Etherscan', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`/transacao/${receipt.transaction!.hash}$`))
  await expect(
    page.getByText('Explorador simulado — esta transação não existe em uma blockchain real.'),
  ).toBeVisible()
  await expect(page.getByText(receipt.transaction!.hash, { exact: true })).toBeVisible()
})

test('pending order stays pending until settlement and only purchased items leave the cart', async ({
  app,
  page,
  api,
  mocks,
}) => {
  await app.goto('/', { scenario: 'payment-pending' })
  await api.login(users.ana)
  await api.addToCart(NFT_IDS.emeraldApe, 'fifty', 2)
  await page.goto('/pagamento')
  const dialog = await connectedReview(page)
  await dialog.getByRole('button', { name: 'Confirmar e pagar', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Aguardando a confirmação da sua carteira', exact: true }),
  ).toBeVisible()
  const pending = await currentOrder(page, api)
  expect(pending.status).toBe('pending')
  await page.clock.runFor(5000)
  await expect(
    page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira', exact: true }),
  ).toHaveCount(0)
  expect((await currentOrder(page, api)).status).toBe('pending')
  await api.addToCart(NFT_IDS.goldenBeat, 'fifty', 1)
  await mocks.settleOrder(pending.id, 'confirmed')
  expect((await expectReceipt(page, api)).id).toBe(pending.id)
  const remaining = await currentCart(api)
  expect(remaining.items.map((item) => [item.nftId, item.quantity])).toEqual([
    [NFT_IDS.goldenBeat, 1],
  ])
  await page.goto('/carrinho')
  await expect(
    page.getByText('Golden Beat #207', { exact: true }).filter({ visible: true }),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'Emerald Ape #042', exact: true })).toHaveCount(0)
})
