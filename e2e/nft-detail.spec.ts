import { cartSchema, nftDetailSchema } from '@/contracts'
import { formatEth } from '@/lib/money'
import { NFT_IDS } from './support/data'
import { expect, test } from './support/fixtures'
import { expectFocusTrapped } from './support/pages/accessibility'

test('cold detail, reload and edition selection show the server price and disable sold-out editions', async ({
  app,
  page,
  api,
  isMobile,
}) => {
  await app.goto(`/nft/${NFT_IDS.emeraldApe}`)
  const response = await api.get(`/nfts/${NFT_IDS.emeraldApe}`)
  expect(response.status).toBe(200)
  const nft = nftDetailSchema.parse(response.body)
  await expect(page.getByRole('heading', { name: nft.name, exact: true, level: 1 })).toBeVisible()
  await page.reload()
  await app.ready()
  await expect(page.getByRole('heading', { name: nft.name, exact: true, level: 1 })).toBeVisible()
  const soldOut = nft.editions.find((edition) => edition.available === 0)!
  await expect(
    page.getByRole('radio', { name: `${soldOut.label}, esgotada`, exact: true }),
  ).toBeDisabled()
  const edition = nft.editions.find(
    (item) => item.available > 0 && item.id !== nft.defaultEditionId,
  )!
  await page.getByRole('radio', { name: edition.label, exact: true }).click()
  await expect.poll(() => new URL(page.url()).searchParams.get('edicao')).toBe(edition.id)
  const priceRegion = page.getByRole('region', {
    name: isMobile ? 'Comprar NFT' : 'Informações e compra do NFT',
    exact: true,
  })
  await expect(
    priceRegion.getByText(formatEth(edition.price), { exact: true }).filter({ visible: true }),
  ).toBeVisible()
  await page.reload()
  await app.ready()
  await expect(page.getByRole('radio', { name: edition.label, exact: true })).toBeChecked()
  await expect(
    priceRegion.getByText(formatEth(edition.price), { exact: true }).filter({ visible: true }),
  ).toBeVisible()
  expect(nftDetailSchema.parse((await api.get(`/nfts/${nft.id}`)).body).editions).toEqual(
    nft.editions,
  )
})

test('unknown NFT offers a catalog link and unknown edition explains its fallback', async ({
  app,
  page,
  api,
}) => {
  await app.goto('/nft/not-a-kurio-nft')
  expect((await api.get('/nfts/not-a-kurio-nft')).status).toBe(404)
  await expect(page.getByRole('heading', { name: 'NFT não encontrado' })).toBeVisible()
  await page.getByRole('link', { name: 'Voltar ao catálogo' }).click()
  await expect(page).toHaveURL('/')
  await app.goto(`/nft/${NFT_IDS.emeraldApe}?edicao=unknown-edition`)
  const nft = nftDetailSchema.parse((await api.get(`/nfts/${NFT_IDS.emeraldApe}`)).body)
  await expect(
    page.getByRole('status').filter({ hasText: 'A edição solicitada não existe' }),
  ).toContainText(
    `Exibindo a edição ${nft.editions.find((edition) => edition.id === nft.defaultEditionId)!.label}`,
  )
  await expect(
    page.getByRole('radio', {
      name: nft.editions.find((edition) => edition.id === nft.defaultEditionId)!.label,
      exact: true,
    }),
  ).toBeChecked()
})

test('quantity stops at the order limit and purchasing sends that quantity to the cart', async ({
  app,
  page,
  api,
  isMobile,
}) => {
  await app.goto(`/nft/${NFT_IDS.emeraldApe}`)
  const nft = nftDetailSchema.parse((await api.get(`/nfts/${NFT_IDS.emeraldApe}`)).body)
  const edition = nft.editions.find((item) => item.id === nft.defaultEditionId)!
  const limit = Math.min(edition.available, edition.maxPerOrder)
  expect(limit).toBe(10)
  await expect(page.getByRole('button', { name: 'Diminuir quantidade' })).toBeDisabled()
  for (let count = 1; count < limit; count++)
    await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
  await expect(page.getByRole('group', { name: 'Quantidade' }).getByRole('status')).toHaveText(
    String(limit),
  )
  await expect(page.getByRole('button', { name: 'Aumentar quantidade' })).toBeDisabled()
  await expect(
    page.getByText(`Máximo de ${limit} por pedido`, { exact: true }).filter({ visible: true }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: isMobile ? 'Comprar NFT' : 'COMPRAR', exact: true })
    .click()
  await expect(page).toHaveURL('/carrinho')
  expect(cartSchema.parse((await api.get('/cart')).body).items).toEqual([
    expect.objectContaining({ nftId: nft.id, editionId: edition.id, quantity: limit }),
  ])
})

test('low stock and quantity already in the cart reduce the remaining allowance', async ({
  app,
  page,
  api,
  isMobile,
}) => {
  await app.goto(`/nft/${NFT_IDS.goldenFrequency}?edicao=fifty`)
  const nft = nftDetailSchema.parse((await api.get(`/nfts/${NFT_IDS.goldenFrequency}`)).body)
  expect(nft.editions.find((edition) => edition.id === 'fifty')?.available).toBe(3)
  await expect(page.getByText('Restam 3', { exact: true }).filter({ visible: true })).toBeVisible()
  await api.addToCart(nft.id, 'fifty', 2)
  await page.reload()
  await app.ready()
  await expect(page.getByRole('status').filter({ hasText: 'Você já tem 2 unidades' })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Quantidade' }).getByRole('status')).toHaveText('1')
  await expect(page.getByRole('button', { name: 'Aumentar quantidade' })).toBeDisabled()
  await expect(
    page.getByText('Máximo de 1 por pedido', { exact: true }).filter({ visible: true }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: isMobile ? 'Comprar NFT' : 'COMPRAR', exact: true })
    .click()
  await expect(page).toHaveURL('/carrinho')
  expect(cartSchema.parse((await api.get('/cart')).body).items[0]).toMatchObject({
    nftId: nft.id,
    editionId: 'fifty',
    quantity: 3,
  })
  await app.goto(`/nft/${nft.id}?edicao=fifty`)
  await expect(page.getByRole('status').filter({ hasText: 'máximo permitido' })).toBeVisible()
  await expect(
    page.getByRole('button', { name: isMobile ? 'Comprar NFT' : 'COMPRAR', exact: true }),
  ).toBeDisabled()
})

test('gallery selection and keyboard navigation feed an accessible zoom with focus restoration', async ({
  app,
  page,
  api,
  isMobile,
}) => {
  await app.goto(`/nft/${NFT_IDS.emeraldApe}`)
  const nft = nftDetailSchema.parse((await api.get(`/nfts/${NFT_IDS.emeraldApe}`)).body)
  const gallery = page.getByRole('region', { name: `Galeria de ${nft.name}` })
  const second = nft.gallery[1]!
  if (isMobile) {
    await gallery.getByRole('button', { name: `Ver ${second.label}`, exact: true }).click()
    await expect(
      gallery.getByRole('button', { name: `Ver ${second.label}`, exact: true }),
    ).toHaveAttribute('aria-current', 'true')
  } else {
    const firstTab = gallery.getByRole('tab', { name: nft.gallery[0]!.label, exact: true })
    await firstTab.focus()
    await firstTab.press('ArrowDown')
    await expect(gallery.getByRole('tab', { name: second.label, exact: true })).toBeFocused()
    await expect(gallery.getByRole('tab', { name: second.label, exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await expect(gallery.getByRole('tabpanel', { name: second.label })).toBeVisible()
    await gallery.getByRole('tab', { name: nft.gallery[2]!.label, exact: true }).click()
    await gallery.getByRole('tab', { name: nft.gallery[2]!.label, exact: true }).press('ArrowUp')
  }
  const zoom = gallery.getByRole('button', {
    name: isMobile ? `Ampliar: ${second.label}` : 'Ampliar obra',
    exact: true,
  })
  await zoom.click()
  const dialog = page.getByRole('dialog', { name: `${nft.name} — ${second.label}`, exact: true })
  await expectFocusTrapped(page, dialog)
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(zoom).toBeFocused()
})
