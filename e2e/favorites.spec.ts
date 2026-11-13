import { favoritesResponseSchema, nftDetailSchema } from '@/contracts'
import { NFT_IDS, users } from './support/data'
import { expect, test } from './support/fixtures'
import { notifications, signIn, signOut } from './support/pages/auth'
import { expectFavorites, toggleCardFavorite } from './support/pages/favorites'

test('visitor signs in from a heart, favorites persist across reload/sign-in and can be removed from the list', async ({
  app,
  page,
  api,
  isMobile,
}) => {
  await app.goto('/?q=Emerald')
  const nft = nftDetailSchema.parse((await api.get(`/nfts/${NFT_IDS.emeraldApe}`)).body)
  await toggleCardFavorite(page, nft.name, true)
  await expect.poll(() => new URL(page.url()).pathname).toBe('/entrar')
  expect(new URL(page.url()).searchParams.get('redirect')).toBe('/?q=Emerald')
  expect((await api.get('/favorites')).status).toBe(401)
  await signIn(page, users.ana)
  await expect(page).toHaveURL('/?q=Emerald')
  await toggleCardFavorite(page, nft.name, true)
  await expect(
    notifications(page).getByText(`${nft.name} adicionado aos favoritos.`, { exact: true }),
  ).toBeVisible()
  expect(
    favoritesResponseSchema.parse((await api.get('/favorites')).body).items.map((item) => item.id),
  ).toContain(nft.id)
  await app.goto('/conta/favoritos')
  expect((await expectFavorites(page, api)).items.map((item) => item.id)).toContain(nft.id)
  await page.reload()
  await app.ready()
  expect((await expectFavorites(page, api)).items).toHaveLength(3)
  await signOut(page, isMobile)
  await app.goto('/entrar?redirect=%2Fconta%2Ffavoritos')
  await signIn(page, users.ana)
  await expectFavorites(page, api)
  await toggleCardFavorite(page, nft.name, false)
  await expect(
    notifications(page).getByText(`${nft.name} removido dos favoritos.`, { exact: true }),
  ).toBeVisible()
  const remaining = await expectFavorites(page, api)
  expect(remaining.items.map((item) => item.id)).not.toContain(nft.id)
  await expect(page.getByRole('heading', { name: nft.name, exact: true })).toHaveCount(0)
})

for (const operation of ['add', 'remove'] as const) {
  test(`optimistic ${operation} rolls back on failure and the second attempt succeeds`, async ({
    app,
    page,
    api,
    mocks,
  }) => {
    await app.goto()
    await api.login(users.ana)
    const nftId = operation === 'add' ? NFT_IDS.emeraldApe : NFT_IDS.neonVessel
    const nft = nftDetailSchema.parse((await api.get(`/nfts/${nftId}`)).body)
    const before = favoritesResponseSchema.parse((await api.get('/favorites')).body)
    const wanted = operation === 'add'
    const label = `${wanted ? 'Favoritar' : 'Remover dos favoritos'}: ${nft.name}`
    await expect(page.getByRole('button', { name: label, exact: true }).first()).toHaveAttribute(
      'aria-pressed',
      String(!wanted),
    )
    await mocks.setScenario('favorite-failure')
    await mocks.configure({ latency: { mode: 'fixed', minMs: 1500, maxMs: 1500 } })
    const failed = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === `/api/favorites/${nft.id}` &&
        response.request().method() === (wanted ? 'PUT' : 'DELETE'),
    )
    await toggleCardFavorite(page, nft.name, wanted)
    const flipped = page
      .getByRole('button', {
        name: `${wanted ? 'Remover dos favoritos' : 'Favoritar'}: ${nft.name}`,
        exact: true,
      })
      .first()
    await expect(flipped).toHaveAttribute('aria-pressed', String(wanted))
    expect((await failed).status()).toBe(500)
    await expect(page.getByRole('button', { name: label, exact: true }).first()).toHaveAttribute(
      'aria-pressed',
      String(!wanted),
    )
    await expect(
      notifications(page).getByText(
        wanted
          ? `Não foi possível favoritar ${nft.name}.`
          : `Não foi possível remover ${nft.name} dos favoritos.`,
        { exact: true },
      ),
    ).toBeVisible()
    expect(favoritesResponseSchema.parse((await api.get('/favorites')).body)).toEqual(before)
    await toggleCardFavorite(page, nft.name, wanted)
    await expect(flipped).toHaveAttribute('aria-pressed', String(wanted))
    await expect(
      notifications(page).getByText(
        `${nft.name} ${wanted ? 'adicionado aos' : 'removido dos'} favoritos.`,
        { exact: true },
      ),
    ).toBeVisible()
    expect(
      favoritesResponseSchema
        .parse((await api.get('/favorites')).body)
        .items.some((item) => item.id === nft.id),
    ).toBe(wanted)
    await app.goto('/conta/favoritos')
    await expectFavorites(page, api)
  })
}

test('each collector sees only their own saved NFTs', async ({ app, page, api, isMobile }) => {
  await app.goto()
  await api.login(users.ana)
  await app.goto('/conta/favoritos')
  const ana = await expectFavorites(page, api)
  expect(ana.items.map((item) => item.id).sort()).toEqual(
    [NFT_IDS.neonVessel, NFT_IDS.goldenBeat].sort(),
  )
  await signOut(page, isMobile)
  await app.goto('/entrar?redirect=%2Fconta%2Ffavoritos')
  await signIn(page, users.bruno)
  const bruno = await expectFavorites(page, api)
  expect(bruno.items.map((item) => item.id)).toEqual([NFT_IDS.ivoryBaron])
  for (const item of ana.items)
    await expect(page.getByRole('heading', { name: item.name, exact: true })).toHaveCount(0)
  await page.reload()
  await app.ready()
  expect((await expectFavorites(page, api)).items).toEqual(bruno.items)
})
