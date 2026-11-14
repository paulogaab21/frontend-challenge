import {
  apiErrorSchema,
  favoritesResponseSchema,
  orderSchema,
  profileSchema,
  sessionSchema,
} from '@/contracts'
import { formatEth } from '@/lib/money'
import { users } from './support/data'
import { expect, test } from './support/fixtures'
import { expectFieldError } from './support/pages/accessibility'
import { notifications, signIn, signOut } from './support/pages/auth'

test('registration validates locally, reports both API conflicts and establishes a new session', async ({
  app,
  page,
  api,
  mocks,
  isMobile,
}) => {
  await app.goto('/cadastro?redirect=%2Fconta%2Fperfil')
  const initialUsers = Object.keys((await mocks.snapshot()).users).length
  const form = page.getByRole('form', { name: 'Criar perfil de colecionador' })
  const submit = form.getByRole('button', {
    name: isMobile ? 'Criar perfil' : 'Criar conta',
    exact: true,
  })
  await form.getByRole('textbox', { name: 'Nome de usuário', exact: true }).fill('new.collector')
  await form.getByRole('textbox', { name: 'E-mail', exact: true }).fill('invalid-email')
  await form.getByLabel('Senha', { exact: true }).fill('a1')
  await form.getByLabel('Confirmar senha', { exact: true }).fill('other')
  await submit.click()
  await expectFieldError(
    form.getByRole('textbox', { name: 'E-mail', exact: true }),
    /e-mail válido/,
  )
  await expectFieldError(form.getByLabel('Senha', { exact: true }), /pelo menos 8/)
  await expectFieldError(form.getByLabel('Confirmar senha', { exact: true }), /não conferem/)
  expect(Object.keys((await mocks.snapshot()).users)).toHaveLength(initialUsers)
  await form.getByLabel('Senha', { exact: true }).fill('Collector@2026')
  await form.getByLabel('Confirmar senha', { exact: true }).fill('Collector@2026')

  for (const [field, value, otherField, otherValue, apiField] of [
    ['E-mail', users.ana.email, 'Nome de usuário', 'new.collector', 'email'],
    ['Nome de usuário', 'ana.souza', 'E-mail', 'new.collector@kurio.test', 'username'],
  ] as const) {
    await form.getByLabel(otherField, { exact: true }).fill(otherValue)
    await form.getByLabel(field, { exact: true }).fill(value)
    const failed = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/api/users' && response.request().method() === 'POST',
    )
    await submit.click()
    const response = await failed
    expect(response.status()).toBe(409)
    const error = apiErrorSchema.parse(await response.json())
    await expect(
      form.getByRole('alert').filter({ hasText: error.fieldErrors![apiField]![0]! }),
    ).toBeVisible()
    await expect(form.getByLabel(field, { exact: true })).toHaveAttribute('aria-invalid', 'true')
    expect(Object.keys((await mocks.snapshot()).users)).toHaveLength(initialUsers)
  }
  await form.getByRole('textbox', { name: 'Nome de usuário', exact: true }).fill('new.collector')
  await submit.click()
  await expect(page).toHaveURL('/conta/perfil')
  const session = sessionSchema.parse((await api.get('/session')).body)
  expect(session.user).toMatchObject({
    username: 'new.collector',
    email: 'new.collector@kurio.test',
  })
  expect(Object.keys((await mocks.snapshot()).users)).toHaveLength(initialUsers + 1)
  await expect(
    page
      .getByRole('form', { name: 'Perfil do colecionador' })
      .getByRole('textbox', { name: 'E-mail', exact: true }),
  ).toHaveValue(session.user.email)
})

test('generic sign-in error, guarded return, persisted session and sign-out clear private access', async ({
  app,
  page,
  api,
  isMobile,
}) => {
  await app.goto('/conta/perfil')
  await expect.poll(() => new URL(page.url()).searchParams.get('redirect')).toBe('/conta/perfil')
  await signIn(page, { email: users.ana.email, password: 'incorrect-password' })
  await expect(
    page.getByRole('form', { name: 'Entrar', exact: true }).getByRole('alert'),
  ).toHaveText('E-mail ou senha incorretos.')
  expect((await api.get('/session')).status).toBe(401)
  await signIn(page, users.ana)
  await expect(page).toHaveURL('/conta/perfil')
  await expect(page.getByRole('textbox', { name: 'Nome de exibição', exact: true })).toHaveValue(
    'Ana Souza',
  )
  const identity = sessionSchema.parse((await api.get('/session')).body).user
  expect(identity.id).toBe(users.ana.id)
  await page.reload()
  await app.ready()
  await expect(page.getByRole('textbox', { name: 'E-mail', exact: true })).toHaveValue(
    users.ana.email,
  )
  expect(sessionSchema.parse((await api.get('/session')).body).user).toEqual(identity)
  await signOut(page, isMobile)
  expect((await api.get('/profile')).status).toBe(401)
  await app.goto('/conta/perfil')
  await expect(page).toHaveURL(/\/entrar\?redirect=/)
  await expect(page.getByRole('form', { name: 'Perfil do colecionador' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Menu de Ana Souza' })).toHaveCount(0)
})

test('server expiry during private navigation keeps the return path through sign-in', async ({
  app,
  page,
  api,
  mocks,
}) => {
  await app.goto('/entrar')
  await api.login(users.ana)
  await app.goto('/conta/perfil')
  await expect(page.getByRole('textbox', { name: 'E-mail', exact: true })).toHaveValue(
    users.ana.email,
  )
  await mocks.expireSessions()
  await page
    .getByRole('navigation', { name: 'Menu da conta' })
    .getByRole('link', { name: 'Carteiras', exact: true })
    .click()
  await expect.poll(() => new URL(page.url()).pathname).toBe('/entrar')
  await expect.poll(() => new URL(page.url()).searchParams.get('motivo')).toBe('sessao-expirada')
  expect(new URL(page.url()).searchParams.get('redirect')).toBe('/conta/carteiras')
  await expect(
    notifications(page).getByText('Sua sessão expirou. Entre novamente para continuar.', {
      exact: true,
    }),
  ).toBeVisible()
  expect((await api.get('/wallets')).status).toBe(401)
  await signIn(page, users.ana)
  await expect(page).toHaveURL('/conta/carteiras')
  await expect(page.getByRole('heading', { name: 'Carteira principal', exact: true })).toBeVisible()
  expect(sessionSchema.parse((await api.get('/session')).body).user.id).toBe(users.ana.id)
})

test('timer expiry on a public page restores visitor navigation without redirecting', async ({
  app,
  page,
  api,
  isMobile,
}) => {
  await app.goto()
  await api.login(users.ana)
  if (!isMobile) await expect(page.getByRole('button', { name: 'Menu de Ana Souza' })).toBeVisible()
  await page.clock.fastForward('31:00')
  await expect(
    notifications(page).getByText('Sua sessão expirou. Entre novamente para continuar.', {
      exact: true,
    }),
  ).toBeVisible()
  await expect(page).toHaveURL('/')
  if (isMobile) {
    await page
      .getByRole('navigation', { name: 'Navegação móvel' })
      .getByRole('link', { name: 'Perfil', exact: true })
      .click()
    await expect(page.getByRole('form', { name: 'Entrar', exact: true })).toBeVisible()
  } else {
    await expect(
      page.getByRole('banner').getByRole('link', { name: 'Entrar', exact: true }),
    ).toBeVisible()
  }
  expect((await api.get('/session')).status).toBe(401)
})

test('switching collectors isolates profile, favorites and order ownership', async ({
  app,
  page,
  api,
  isMobile,
}) => {
  await app.goto('/entrar')
  await signIn(page, users.ana)
  await expect(page).toHaveURL('/')
  await app.goto('/conta/favoritos')
  const anaFavorites = favoritesResponseSchema.parse((await api.get('/favorites')).body).items
  await expect(page.getByRole('main').getByRole('article').getByRole('heading')).toHaveText(
    anaFavorites.map((nft) => nft.name),
  )
  await app.goto('/pedido/ord_1000')
  await expect(
    page.getByRole('heading', { name: 'Este pedido pertence a outra conta' }),
  ).toBeVisible()
  expect((await api.get('/orders/ord_1000')).status).toBe(403)
  await app.goto('/conta/perfil')
  await expect(page.getByRole('textbox', { name: 'Nome de exibição', exact: true })).toHaveValue(
    'Ana Souza',
  )
  await signOut(page, isMobile)
  await app.goto('/entrar?redirect=%2Fconta%2Fperfil')
  await signIn(page, users.bruno)
  await expect(page).toHaveURL('/conta/perfil')
  const profile = profileSchema.parse((await api.get('/profile')).body)
  expect(profile.id).toBe(users.bruno.id)
  await expect(page.getByRole('textbox', { name: 'Nome de exibição', exact: true })).toHaveValue(
    'Bruno Lima',
  )
  await expect(page.getByRole('textbox', { name: 'E-mail', exact: true })).toHaveValue(
    users.bruno.email,
  )
  await expect(page.getByText('Ana Souza', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('textbox', { name: 'E-mail', exact: true })).not.toHaveValue(
    users.ana.email,
  )
  await app.goto('/conta/favoritos')
  const brunoFavorites = favoritesResponseSchema.parse((await api.get('/favorites')).body).items
  await expect(page.getByRole('main').getByRole('article').getByRole('heading')).toHaveText(
    brunoFavorites.map((nft) => nft.name),
  )
  for (const nft of anaFavorites)
    await expect(page.getByRole('heading', { name: nft.name, exact: true })).toHaveCount(0)
  await app.goto('/pedido/ord_1000')
  const orderResponse = await api.get('/orders/ord_1000')
  expect(orderResponse.status).toBe(200)
  const order = orderSchema.parse(orderResponse.body)
  expect(order.collector.email).toBe(users.bruno.email)
  await expect(
    page.getByRole('heading', { name: 'Este pedido pertence a outra conta' }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' }),
  ).toBeVisible()
  await expect(page.getByRole('main')).toContainText(formatEth(order.total))
  for (const item of order.items) await expect(page.getByRole('main')).toContainText(item.name)
})
