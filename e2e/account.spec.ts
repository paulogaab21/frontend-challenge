import {
  apiErrorSchema,
  AVATAR_MAX_BYTES,
  profileSchema,
  sessionSchema,
  shortenAddress,
  walletsResponseSchema,
} from '@/contracts'
import { anaWallet, NFT_IDS, users } from './support/data'
import { expect, test } from './support/fixtures'
import { expectFieldError } from './support/pages/accessibility'
import {
  AVATAR_PNG,
  BRUNO_ADDRESS,
  SOLANA_ADDRESS,
  chooseOption,
  expectHeaderAvatar,
  fillBrunoWallet,
} from './support/pages/account'
import { notifications, signIn, signOut } from './support/pages/auth'

test('profile validates client fields, reports an email conflict and saves the name across header and reload', async ({
  app,
  page,
  api,
  isMobile,
}) => {
  await app.goto()
  await api.login(users.ana)
  await app.goto('/conta/perfil')
  const before = profileSchema.parse((await api.get('/profile')).body)
  const form = page.getByRole('form', { name: 'Perfil do colecionador' })
  const name = form.getByRole('textbox', { name: 'Nome de exibição', exact: true })
  const email = form.getByRole('textbox', { name: 'E-mail', exact: true })
  const ens = form.getByRole('textbox', { name: 'Nome ENS', exact: true })
  await name.fill('')
  await email.fill('invalid-address')
  await ens.fill('Invalid ENS!')
  await form.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expectFieldError(name, /pelo menos 2/)
  await expectFieldError(email, /e-mail válido/)
  await expectFieldError(ens, /letras minúsculas/)
  expect(profileSchema.parse((await api.get('/profile')).body)).toEqual(before)
  await name.fill('Ana Colecionadora')
  await email.fill(users.bruno.email)
  await ens.fill(before.ensName)
  const conflict = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === '/api/profile' && response.request().method() === 'PUT',
  )
  await form.getByRole('button', { name: 'Salvar', exact: true }).click()
  const response = await conflict
  expect(response.status()).toBe(409)
  expect(apiErrorSchema.parse(await response.json()).code).toBe('EMAIL_TAKEN')
  await expectFieldError(email, /Já existe uma conta com este e-mail/)
  expect(profileSchema.parse((await api.get('/profile')).body)).toEqual(before)
  await email.fill(users.ana.email)
  await form.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(form.getByRole('status')).toHaveText('Perfil atualizado.')
  const saved = profileSchema.parse((await api.get('/profile')).body)
  expect(saved).toMatchObject({ displayName: 'Ana Colecionadora', email: users.ana.email })
  expect(saved.version).toBeGreaterThan(before.version)
  expect(sessionSchema.parse((await api.get('/session')).body).user.displayName).toBe(
    saved.displayName,
  )
  if (!isMobile)
    await expect(
      page.getByRole('button', { name: `Menu de ${saved.displayName}`, exact: true }),
    ).toBeVisible()
  await page.reload()
  await app.ready()
  await expect(name).toHaveValue(saved.displayName)
  expect(profileSchema.parse((await api.get('/profile')).body)).toEqual(saved)
  if (!isMobile)
    await expect(
      page.getByRole('button', { name: `Menu de ${saved.displayName}`, exact: true }),
    ).toBeVisible()
})

test('avatar rejects invalid files, uploads PNG to preview and header, persists and removes it', async ({
  app,
  page,
  api,
  isMobile,
}) => {
  await app.goto()
  await api.login(users.ana)
  await app.goto('/conta/perfil')
  const form = page.getByRole('form', { name: 'Perfil do colecionador' })
  const input = form.getByLabel('Selecionar avatar', { exact: true })
  const before = profileSchema.parse((await api.get('/profile')).body)
  for (const [file, message] of [
    [
      { name: 'too-large.png', mimeType: 'image/png', buffer: Buffer.alloc(AVATAR_MAX_BYTES + 1) },
      'A imagem deve ter no máximo 2 MB.',
    ],
    [
      { name: 'avatar.txt', mimeType: 'text/plain', buffer: Buffer.from('not an image') },
      'Escolha uma imagem PNG, JPEG ou WebP.',
    ],
  ] as const) {
    await input.setInputFiles(file)
    await expect(form.getByRole('alert')).toHaveText(message)
    expect(profileSchema.parse((await api.get('/profile')).body).avatarUrl).toBe(before.avatarUrl)
  }
  await input.setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: AVATAR_PNG })
  await expect(notifications(page).getByText('Avatar atualizado.', { exact: true })).toBeVisible()
  const uploaded = profileSchema.parse((await api.get('/profile')).body)
  expect(uploaded.avatarUrl).toMatch(/^data:image\/png;base64,/)
  await expect(form.getByRole('img', { name: 'Avatar de Ana Souza', exact: true })).toHaveAttribute(
    'src',
    uploaded.avatarUrl!,
  )
  if (!isMobile) await expectHeaderAvatar(page, uploaded.avatarUrl)
  await expect(form.getByRole('alert')).toHaveCount(0)
  await page.reload()
  await app.ready()
  await expect(form.getByRole('img', { name: 'Avatar de Ana Souza', exact: true })).toBeVisible()
  await form.getByRole('button', { name: 'Remover', exact: true }).click()
  await expect(notifications(page).getByText('Avatar removido.', { exact: true })).toBeVisible()
  expect(profileSchema.parse((await api.get('/profile')).body).avatarUrl).toBeNull()
  await expect(form.getByRole('img', { name: 'Avatar de Ana Souza', exact: true })).toHaveCount(0)
  if (!isMobile) await expectHeaderAvatar(page, null)
})

test('password checks the current secret and confirmation, then only the new password signs in', async ({
  app,
  page,
  api,
  isMobile,
}) => {
  await app.goto()
  await api.login(users.ana)
  await app.goto('/conta/perfil')
  const form = page.getByRole('form', { name: 'Alterar senha', exact: true })
  const current = form.getByLabel('Senha atual', { exact: true })
  const next = form.getByLabel('Nova senha', { exact: true })
  const confirmation = form.getByLabel('Confirmar nova senha', { exact: true })
  await current.fill('Wrong@2026')
  await next.fill('Changed@2026')
  await confirmation.fill('Mismatch@2026')
  await form.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expectFieldError(confirmation, /não conferem/)
  await confirmation.fill('Changed@2026')
  const rejected = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === '/api/profile/password' &&
      response.request().method() === 'PUT',
  )
  await form.getByRole('button', { name: 'Salvar', exact: true }).click()
  const response = await rejected
  expect(response.status()).toBe(422)
  expect(apiErrorSchema.parse(await response.json()).code).toBe('WRONG_PASSWORD')
  await expectFieldError(current, /senha atual está incorreta/)
  await current.fill(users.ana.password)
  await form.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(notifications(page).getByText('Senha alterada.', { exact: true })).toBeVisible()
  await expect(current).toHaveValue('')
  await expect(next).toHaveValue('')
  await signOut(page, isMobile)
  await app.goto('/entrar?redirect=%2Fconta%2Fperfil')
  await signIn(page, users.ana)
  await expect(
    page.getByRole('form', { name: 'Entrar', exact: true }).getByRole('alert'),
  ).toHaveText('E-mail ou senha incorretos.')
  expect((await api.request('POST', '/session', users.ana)).status).toBe(401)
  await signIn(page, { email: users.ana.email, password: 'Changed@2026' })
  await expect(page).toHaveURL('/conta/perfil')
  expect(sessionSchema.parse((await api.get('/session')).body).user.id).toBe(users.ana.id)
})

test('wallets validate by network, report ownership conflicts and persist primary, mirrored secondary and edits into checkout', async ({
  app,
  page,
  api,
}) => {
  await app.goto()
  await api.login(users.bruno)
  await app.goto('/conta/carteiras')
  expect(walletsResponseSchema.parse((await api.get('/wallets')).body).items).toEqual([])
  const primary = page.getByRole('region', { name: 'Carteira principal', exact: true })
  const secondary = page.getByRole('region', { name: 'Carteira secundária', exact: true })
  const form = primary.getByRole('form', { name: 'Dados da carteira', exact: true })
  const save = form.getByRole('button', { name: 'Salvar carteira', exact: true })
  await expect(
    secondary.getByRole('checkbox', { name: 'Igual à carteira principal' }),
  ).toBeDisabled()
  await save.click()
  for (const name of [
    'Nome de exibição',
    'Apelido da carteira',
    'Nome do perfil',
    'Endereço da carteira',
    'Código de indicação',
    'E-mail',
    'Nome ENS',
  ])
    await expect(form.getByRole('textbox', { name, exact: true })).toHaveAttribute(
      'aria-invalid',
      'true',
    )
  for (const name of ['Rede', 'Tipo de carteira'])
    await expect(form.getByRole('combobox', { name, exact: true })).toHaveAttribute(
      'aria-invalid',
      'true',
    )
  expect(walletsResponseSchema.parse((await api.get('/wallets')).body).items).toEqual([])
  await fillBrunoWallet(page, form)
  const address = form.getByRole('textbox', { name: 'Endereço da carteira', exact: true })
  await chooseOption(page, form, 'Rede', 'Solana')
  await expectFieldError(address, /Solana válido/)
  await address.fill(SOLANA_ADDRESS)
  await address.press('Tab')
  await expect(address).toHaveAttribute('aria-invalid', 'false')
  await chooseOption(page, form, 'Rede', 'Ethereum')
  await expectFieldError(address, /0x com 40/)
  await address.fill(anaWallet.address)
  const conflict = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === '/api/wallets' && response.request().method() === 'POST',
  )
  await save.click()
  const response = await conflict
  expect(response.status()).toBe(409)
  expect(apiErrorSchema.parse(await response.json()).code).toBe('WALLET_ADDRESS_TAKEN')
  await expectFieldError(address, /outra conta/)
  expect(walletsResponseSchema.parse((await api.get('/wallets')).body).items).toEqual([])
  await address.fill(BRUNO_ADDRESS)
  await save.click()
  await expect(primary.getByRole('heading', { name: 'Bruno principal', exact: true })).toBeVisible()
  let wallets = walletsResponseSchema.parse((await api.get('/wallets')).body).items
  expect(wallets).toEqual([
    expect.objectContaining({
      role: 'primary',
      address: BRUNO_ADDRESS,
      network: 'ethereum',
      nickname: 'Bruno principal',
    }),
  ])
  await secondary.getByRole('checkbox', { name: 'Igual à carteira principal' }).check()
  await secondary.getByRole('button', { name: 'Adicionar', exact: true }).click()
  const secondaryForm = secondary.getByRole('form', { name: 'Dados da carteira' })
  await expect(
    secondaryForm.getByRole('textbox', { name: 'Endereço da carteira', exact: true }),
  ).toHaveValue(BRUNO_ADDRESS)
  await secondaryForm.getByRole('button', { name: 'Salvar carteira', exact: true }).click()
  await expect(secondaryForm).toHaveCount(0)
  wallets = walletsResponseSchema.parse((await api.get('/wallets')).body).items
  expect(wallets).toHaveLength(2)
  expect(wallets[1]).toMatchObject({
    role: 'secondary',
    sameAsPrimary: true,
    address: wallets[0]!.address,
  })
  await primary.getByRole('button', { name: 'Editar', exact: true }).click()
  await form
    .getByRole('textbox', { name: 'Apelido da carteira', exact: true })
    .fill('Bruno atualizada')
  await form.getByRole('button', { name: 'Salvar carteira', exact: true }).click()
  await expect(
    primary.getByRole('heading', { name: 'Bruno atualizada', exact: true }),
  ).toBeVisible()
  wallets = walletsResponseSchema.parse((await api.get('/wallets')).body).items
  expect(wallets[0]!.nickname).toBe('Bruno atualizada')
  await page.reload()
  await app.ready()
  await expect(
    primary.getByRole('heading', { name: 'Bruno atualizada', exact: true }),
  ).toBeVisible()
  await expect(
    secondary.getByRole('checkbox', { name: 'Igual à carteira principal' }),
  ).toBeChecked()
  expect(walletsResponseSchema.parse((await api.get('/wallets')).body).items).toEqual(wallets)
  await api.addToCart(NFT_IDS.emeraldApe, 'fifty')
  await app.goto('/pagamento')
  for (const wallet of wallets) {
    const choice = page.getByRole('radio', {
      name: new RegExp(`${wallet.nickname}.*${shortenAddress(wallet.address)}`),
    })
    await expect(choice).toBeVisible()
    await choice.check()
    await expect(choice).toBeChecked()
  }
  expect(walletsResponseSchema.parse((await api.get('/wallets')).body).items).toEqual(wallets)
})
