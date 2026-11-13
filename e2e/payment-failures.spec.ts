import { type Locator } from '@playwright/test'

import { orderSchema } from '@/contracts'
import { NFT_IDS, users } from './support/data'
import { expect, test } from './support/fixtures'
import {
  connectedReview,
  currentCart,
  currentOrder,
  expandCollector,
  expectReceipt,
  gotoPage,
  loginThroughUi,
  openReview,
} from './support/purchase-page'

test.beforeEach(async ({ app, api }) => {
  await app.goto('/')
  await api.login(users.ana)
  await api.addToCart(NFT_IDS.emeraldApe, 'fifty', 2)
})

test('declined payment preserves cart and a new retry can succeed', async ({
  page,
  mocks,
  api,
}) => {
  await mocks.setScenario('payment-declined')
  await gotoPage(page, '/pagamento')
  const before = await currentCart(api)
  await (await connectedReview(page)).getByRole('button', { name: 'Confirmar e pagar' }).click()
  await expect(
    page.getByRole('heading', { name: 'Aguardando a confirmação da sua carteira' }),
  ).toBeVisible()
  const first = await currentOrder(page, api)
  await page.clock.runFor(3000)
  await expect(page.getByRole('heading', { name: 'Pagamento recusado', exact: true })).toBeVisible()
  const lines = (cart: typeof before) => cart.items.map(({ nftVersion: _version, ...item }) => item)
  expect(lines(await currentCart(api))).toEqual(lines(before))
  await mocks.setScenario('default')
  await page.getByRole('link', { name: 'Tentar novamente', exact: true }).click()
  await (await connectedReview(page)).getByRole('button', { name: 'Confirmar e pagar' }).click()
  const next = await expectReceipt(page, api)
  expect(next.id).not.toBe(first.id)
  expect((await currentCart(api)).items).toEqual([])
})

for (const input of ['triple click', 'Enter plus click'] as const) {
  test(`${input} submits exactly one order`, async ({ page, mocks }) => {
    await mocks.setScenario('payment-pending')
    await gotoPage(page, '/pagamento')
    const confirm = (await connectedReview(page)).getByRole('button', { name: 'Confirmar e pagar' })
    // Dispatch actual browser input in one turn; subsequent clicks must be ignored by the UI.
    await confirm.scrollIntoViewIfNeeded()
    const box = (await confirm.boundingBox())!
    if (input === 'Enter plus click') {
      await confirm.focus()
      await page.keyboard.press('Enter')
    }
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, {
      clickCount: input === 'triple click' ? 3 : 1,
    })
    await expect(
      page.getByRole('heading', { name: 'Aguardando a confirmação da sua carteira' }),
    ).toBeVisible()
    const orders = Object.values((await mocks.snapshot()).orders).filter(
      (order) => order.userId === users.ana.id,
    )
    expect(orders).toHaveLength(1)
    expect(orders[0]?.items[0]?.quantity).toBe(2)
  })
}

for (const reload of [false, true]) {
  test(`unanswered order recovers the same idempotent purchase${reload ? ' after reload' : ''}`, async ({
    page,
    mocks,
    app,
    api,
  }) => {
    await mocks.setScenario('order-timeout')
    await gotoPage(page, '/pagamento')
    const confirm = (await connectedReview(page)).getByRole('button', { name: 'Confirmar e pagar' })
    await confirm.click()
    await expect
      .poll(
        async () =>
          Object.values((await mocks.snapshot()).orders).filter(
            (order) => order.userId === users.ana.id,
          ).length,
      )
      .toBe(1)
    const original = Object.values((await mocks.snapshot()).orders).find(
      (order) => order.userId === users.ana.id,
    )!
    await page.clock.fastForward(16_000)
    await expect(
      page.getByRole('heading', { name: 'Não recebemos a confirmação do envio', exact: true }),
    ).toBeVisible()
    if (reload) {
      await page.reload()
      await app.ready()
      await expect(
        page.getByRole('heading', { name: 'Não recebemos a confirmação do envio', exact: true }),
      ).toBeVisible()
    }
    const replay = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/api/orders' &&
        response.request().method() === 'POST' &&
        response.headers()['idempotent-replayed'] === 'true',
    )
    await page.getByRole('button', { name: 'Verificar e concluir', exact: true }).click()
    expect(orderSchema.parse(await (await replay).json()).id).toBe(original.id)
    expect((await expectReceipt(page, api)).id).toBe(original.id)
    expect(
      Object.values((await mocks.snapshot()).orders).filter(
        (order) => order.userId === users.ana.id,
      ),
    ).toHaveLength(1)
  })
}

test('rejected wallet blocks payment until a new connection is approved', async ({
  page,
  mocks,
}) => {
  await mocks.setScenario('wallet-rejected')
  await gotoPage(page, '/pagamento')
  const dialog = await openReview(page)
  await expect(dialog.getByRole('button', { name: 'Tentar conectar novamente' })).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Confirmar e pagar' })).toBeDisabled()
  expect(await mocks.pendingOrders()).toEqual([])
  await mocks.configure({ walletConnection: 'approve' })
  await dialog.getByRole('button', { name: 'Tentar conectar novamente' }).click()
  await expect(dialog.getByText('Carteira conectada', { exact: true })).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Confirmar e pagar' })).toBeEnabled()
})

test('wallet disconnect through Socket.IO blocks review and offers reconnection', async ({
  page,
  mocks,
}) => {
  test.fixme(
    true,
    'The server publishes wallet.updated with disconnected status, but review keeps payment enabled and shows no reconnect action.',
  )
  await mocks.setScenario('wallet-disconnects')
  await gotoPage(page, '/pagamento')
  const dialog = await connectedReview(page)
  await page.clock.runFor(4500)
  await expect(dialog.getByRole('button', { name: 'Reconectar carteira' })).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Confirmar e pagar' })).toBeDisabled()
  expect(
    Object.values((await mocks.snapshot()).connections).every(
      (connection) => connection.status === 'disconnected',
    ),
  ).toBe(true)
})

test('expired checkout session retains the typed draft through UI sign-in and completes', async ({
  page,
  mocks,
  api,
  isMobile,
}) => {
  await mocks.setScenario('session-expires-at-checkout')
  await gotoPage(page, '/pagamento')
  await expandCollector(page, isMobile)
  const note = 'Entrega para minha coleção principal.'
  await page.getByRole('textbox', { name: 'Observação do colecionador (opcional)' }).fill(note)
  await (await connectedReview(page)).getByRole('button', { name: 'Confirmar e pagar' }).click()
  await expect(page).toHaveURL(/\/entrar\?.*redirect=/)
  expect(
    Object.values((await mocks.snapshot()).orders).filter((order) => order.userId === users.ana.id),
  ).toEqual([])
  await loginThroughUi(page)
  await expect(page).toHaveURL(/\/pagamento$/)
  await expandCollector(page, isMobile)
  await expect(
    page.getByRole('textbox', { name: 'Observação do colecionador (opcional)' }),
  ).toHaveValue(note)
  await (await connectedReview(page)).getByRole('button', { name: 'Confirmar e pagar' }).click()
  expect((await expectReceipt(page, api)).collector.note).toBe(note)
})

async function expectFieldError(field: Locator): Promise<void> {
  await expect(field).toHaveAttribute('aria-invalid', 'true')
  await expect(field).toHaveAttribute('aria-describedby', /\S+/)
  await expect(field).toHaveAccessibleDescription(/.+/)
}

test('collector validation links errors, focuses first invalid field and sends no order', async ({
  page,
  isMobile,
  mocks,
}) => {
  await gotoPage(page, '/pagamento')
  await page.getByRole('radio', { name: 'Usar outra carteira?', exact: true }).check()
  await expandCollector(page, isMobile)
  let orderRequests = 0
  page.on('request', (request) => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/orders')
      orderRequests++
  })
  const name = page.getByRole('textbox', { name: 'Nome de exibição' })
  const email = page.getByRole('textbox', { name: 'E-mail', exact: true })
  const address = page.getByRole('textbox', { name: 'Endereço da carteira', exact: true })
  await name.fill('')
  await email.fill('email-invalido')
  await address.fill('endereco-invalido')
  await page.getByRole('button', { name: 'Confirmar compra', exact: true }).click()
  await expectFieldError(name)
  await expectFieldError(email)
  await expectFieldError(address)
  await expect(name).toBeFocused()
  await name.fill('Ana Souza')
  await email.fill(users.ana.email)
  await address.fill('0xA91F3C5D7E9B1A2C4D6E8F0A1B3C5D7E9F1AE82C')
  await page.getByRole('combobox', { name: 'Rede', exact: true }).click()
  await page.getByRole('option', { name: 'Solana', exact: true }).click()
  await page.getByRole('button', { name: 'Confirmar compra', exact: true }).click()
  await expectFieldError(address)
  await expect(address).toHaveAccessibleDescription(/Solana/)
  expect(orderRequests).toBe(0)
  expect(await mocks.pendingOrders()).toEqual([])
  await expect(page.getByRole('dialog', { name: 'Revise seu pedido' })).toHaveCount(0)
})
