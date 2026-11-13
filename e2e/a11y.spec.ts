import AxeBuilder from '@axe-core/playwright'
import { nftDetailSchema } from '@/contracts'
import { NFT_IDS, users } from './support/data'
import { expect, expectNoHorizontalOverflow, test } from './support/fixtures'
import {
  expectFieldError,
  expectFocusTrapped,
  expectPainted,
  tabTo,
} from './support/pages/accessibility'
import { expectCatalog, market } from './support/pages/catalog'

test('keyboard reaches the skip link, header search, filters, sort, card actions and pagination', async ({
  app,
  page,
  api,
  isMobile,
}) => {
  await app.goto()
  await expectCatalog(page, api)
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Pular para o conteúdo', exact: true })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('main')).toBeFocused()
  await page.reload()
  await app.ready()
  await expectCatalog(page, api)
  if (!isMobile) {
    const trigger = page.getByRole('button', { name: 'Buscar NFTs', exact: true })
    await tabTo(page, trigger)
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: 'Buscar NFTs', exact: true })
    await expectFocusTrapped(page, dialog)
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(trigger).toBeFocused()
  }
  let filters = page.getByRole('complementary', { name: 'Filtros do catálogo' })
  if (isMobile) {
    const trigger = page.getByRole('button', { name: 'Abrir filtros', exact: true })
    await tabTo(page, trigger)
    await page.keyboard.press('Enter')
    filters = page.getByRole('dialog', { name: 'Filtros', exact: true })
  }
  const network = filters.getByRole('button', { name: /^Ethereum/ })
  await tabTo(page, network)
  await page.keyboard.press('Space')
  await expect(network).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(() => new URL(page.url()).searchParams.get('rede')).toBe('ethereum')
  if (isMobile) await page.keyboard.press('Escape')
  await expectCatalog(page, api)
  const sort = market(page).getByRole('combobox', { name: 'Ordenar por' })
  await tabTo(page, sort)
  await page.keyboard.press('Enter')
  await expect(page.getByRole('listbox')).toBeVisible()
  await expect(
    page.getByRole('option', { name: 'Listados recentemente', exact: true }),
  ).toBeFocused()
  await page.keyboard.press('Home')
  await expect(
    page.getByRole('option', { name: 'Listados recentemente', exact: true }),
  ).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('option', { name: 'Menor preço', exact: true })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect.poll(() => new URL(page.url()).searchParams.get('ordem')).toBe('preco-asc')
  const result = await expectCatalog(page, api)
  const first = result.items[0]!
  const card = market(page)
    .getByRole('article')
    .filter({ has: page.getByRole('heading', { name: first.name, exact: true }) })
  const action = card.getByRole('button', { name: `Favoritar: ${first.name}`, exact: true })
  await tabTo(page, action)
  await expectPainted(action)
  const next = market(page).getByRole('link', { name: 'Página 2', exact: true })
  await tabTo(page, next)
  await page.keyboard.press('Enter')
  await expect.poll(() => new URL(page.url()).searchParams.get('pagina')).toBe('2')
  expect((await expectCatalog(page, api)).page).toBe(2)
})

test('auth dialog or filter drawer traps focus, exposes labels and closes with Escape', async ({
  app,
  page,
  api,
  isMobile,
}) => {
  await app.goto()
  await expectCatalog(page, api)
  const trigger = isMobile
    ? page.getByRole('button', { name: 'Abrir filtros', exact: true })
    : page.getByRole('banner').getByRole('link', { name: 'Entrar', exact: true })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: isMobile ? 'Filtros' : 'Entrar', exact: true })
  await expectFocusTrapped(page, dialog)
  await expect(dialog).toHaveAttribute('aria-labelledby', /.+/)
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  if (isMobile) await expect(trigger).toBeFocused()
})

test.fixme('route-driven auth dialog restores focus to the sign-in link', async ({
  app,
  page,
  api,
}) => {
  // AuthPage replaces HomePage and loses its opener during navigation (src/features/auth/auth-page.tsx:155).
  await page.setViewportSize({ width: 1440, height: 900 })
  await app.goto()
  await expectCatalog(page, api)
  const trigger = page.getByRole('banner').getByRole('link', { name: 'Entrar', exact: true })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: 'Entrar', exact: true })
  await expectFocusTrapped(page, dialog)
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(trigger).toBeFocused()
})

test('tablet drawer and gallery zoom expose modal labels and restore focus', async ({
  app,
  page,
  api,
}) => {
  await page.setViewportSize({ width: 768, height: 900 })
  await app.goto()
  await expectCatalog(page, api)
  const trigger = page.getByRole('button', { name: 'Filtros', exact: true })
  await trigger.click()
  const sheet = page.getByRole('dialog', { name: 'Filtros', exact: true })
  await expectFocusTrapped(page, sheet)
  await page.keyboard.press('Escape')
  await expect(sheet).toHaveCount(0)
  await expect(trigger).toBeFocused()
  await app.goto(`/nft/${NFT_IDS.emeraldApe}`)
  const nft = nftDetailSchema.parse((await api.get(`/nfts/${NFT_IDS.emeraldApe}`)).body)
  const zoom = page.getByRole('button', { name: 'Ampliar obra', exact: true })
  await zoom.click()
  const dialog = page.getByRole('dialog', { name: `${nft.name} — ${nft.gallery[0]!.label}` })
  await expectFocusTrapped(page, dialog)
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(zoom).toBeFocused()
})

test('account menu supports arrow keys, Escape and focus return', async ({ app, page, api }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await app.goto()
  await api.login(users.ana)
  const trigger = page.getByRole('button', { name: 'Menu de Ana Souza', exact: true })
  await trigger.focus()
  await page.keyboard.press('Enter')
  const menu = page.getByRole('menu')
  await expect(menu).toBeVisible()
  await page.keyboard.press('Home')
  await expect(menu.getByRole('menuitem', { name: 'Perfil', exact: true })).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(menu.getByRole('menuitem', { name: 'Carteiras', exact: true })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(menu).toHaveCount(0)
  await expect(trigger).toBeFocused()
  expect((await api.get('/profile')).status).toBe(200)
})

test('sign-up and profile errors are linked, announced and focus the first invalid field', async ({
  app,
  page,
  api,
  mocks,
  isMobile,
}) => {
  await app.goto('/cadastro')
  const registration = page.getByRole('form', { name: 'Criar perfil de colecionador' })
  await registration
    .getByRole('button', { name: isMobile ? 'Criar perfil' : 'Criar conta', exact: true })
    .click()
  const username = registration.getByRole('textbox', { name: 'Nome de usuário', exact: true })
  await expect(username).toBeFocused()
  await expectFieldError(username, /pelo menos 3/)
  await expectFieldError(
    registration.getByRole('textbox', { name: 'E-mail', exact: true }),
    /Informe o e-mail/,
  )
  await expectFieldError(registration.getByLabel('Senha', { exact: true }), /pelo menos 8/)
  expect(Object.keys((await mocks.snapshot()).users)).toHaveLength(2)
  await api.login(users.ana)
  await app.goto('/conta/perfil')
  const profile = page.getByRole('form', { name: 'Perfil do colecionador' })
  const name = profile.getByRole('textbox', { name: 'Nome de exibição', exact: true })
  await name.fill('')
  await profile.getByRole('textbox', { name: 'E-mail', exact: true }).fill('invalid')
  await profile.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(name).toBeFocused()
  await expectFieldError(name, /pelo menos 2/)
  await expectFieldError(
    profile.getByRole('textbox', { name: 'E-mail', exact: true }),
    /e-mail válido/,
  )
  expect((await api.get<{ displayName: string }>('/profile')).body.displayName).toBe('Ana Souza')
})

const screens = [
  { name: 'home', route: '/', ready: 'Todos os NFTs', role: 'tab' },
  {
    name: 'detail',
    route: `/nft/${NFT_IDS.emeraldApe}`,
    ready: 'Emerald Ape #042',
    role: 'heading',
  },
  {
    name: 'cart with items',
    route: '/carrinho',
    ready: 'Carrinho de NFTs',
    role: 'heading',
    cart: true,
  },
  { name: 'sign-in', route: '/entrar', ready: 'Entrar', role: 'form' },
  { name: 'sign-up', route: '/cadastro', ready: 'Criar perfil de colecionador', role: 'form' },
  {
    name: 'profile',
    route: '/conta/perfil',
    ready: 'Perfil do colecionador',
    role: 'form',
    private: true,
  },
  {
    name: 'wallets',
    route: '/conta/carteiras',
    ready: 'Carteira principal',
    role: 'region',
    private: true,
  },
  {
    name: 'favorites',
    route: '/conta/favoritos',
    ready: 'Lista de interesse',
    role: 'heading',
    private: true,
  },
  { name: '404', route: '/not-a-kurio-route', ready: 'Página não encontrada', role: 'heading' },
] as const

for (const screen of screens) {
  test(`WCAG 2.1 A/AA: ${screen.name}`, async ({ app, page, api }, testInfo) => {
    await app.goto()
    if ('private' in screen) await api.login(users.ana)
    if ('cart' in screen) await api.addToCart(NFT_IDS.emeraldApe, 'fifty')
    await app.goto(screen.route)
    await expect(page.getByRole(screen.role, { name: screen.ready, exact: true })).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    await testInfo.attach('axe-results', {
      body: JSON.stringify(results, null, 2),
      contentType: 'application/json',
    })
    expect(results.violations).toEqual([])
  })
}

for (const width of [390, 768, 1440, 720]) {
  test(`all screens fit ${width}px${width === 720 ? ' (200% reflow equivalent)' : ''}`, async ({
    app,
    page,
    api,
  }) => {
    await page.setViewportSize({ width, height: 900 })
    await app.goto()
    await api.addToCart(NFT_IDS.emeraldApe, 'fifty')
    for (const screen of screens) {
      if (screen.name === 'profile') await api.login(users.ana)
      await app.goto(screen.route)
      await expect(page.getByRole(screen.role, { name: screen.ready, exact: true })).toBeVisible()
      await page.evaluate(() => document.fonts.ready)
      await expectNoHorizontalOverflow(page)
    }
  })
}

test('reduced motion leaves loading skeletons static', async ({ app, page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await app.goto('/', { scenario: 'slow-network' })
  const loading = page.getByRole('status', { name: 'Carregando NFTs', exact: true })
  await expect(loading).toBeVisible()
  const animations = await loading.evaluate((element) =>
    element.getAnimations({ subtree: true }).map((animation) => ({
      state: animation.playState,
      timing: animation.effect?.getComputedTiming(),
    })),
  )
  expect(
    animations.every(
      (animation) => animation.state !== 'running' || Number(animation.timing?.endTime) <= 1,
    ),
  ).toBe(true)
  await page.clock.runFor(100)
  expect(
    await loading.evaluate(
      (element) =>
        element
          .getAnimations({ subtree: true })
          .filter((animation) => animation.playState === 'running').length,
    ),
  ).toBe(0)
})
