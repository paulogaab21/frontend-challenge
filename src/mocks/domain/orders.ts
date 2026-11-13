import {
  ORDER_UPDATED,
  type CreateOrderRequest,
  type NetworkId,
  type Order,
  type OrderDeclineReason,
  type SimulatedTransaction,
  type WalletProvider,
} from '@/contracts'
import { addEth, fromWei, toWei } from '@/lib/money'

import { mockConfig } from '../config'
import { db, type OrderRecord } from '../db'
import { canonicalJson, hashHex } from '../lib/random'
import { eventBus, type PublishOptions } from '../realtime/bus'
import { type AuthContext } from './auth'
import { createQuote, removePurchased, toQuoteDto } from './cart'
import { adjustAvailability, findEdition, updateNft } from './catalog'
import { nextEvent } from './events'
import { problems } from './problem'
import { cancel, schedule } from './timers'

const EXPLORERS: Record<NetworkId, string> = {
  ethereum: 'Etherscan',
  polygon: 'Polygonscan',
  solana: 'Solscan',
}

/** Fictitious settlement contract shown as the recipient in the simulated explorer. */
const MARKETPLACE_CONTRACT = '0x7A420B1E55ED5EA1ED0FACADE0DEC0DE0BA519E8'

const PROVIDER_LABELS: Record<WalletProvider, string> = {
  metamask: 'MetaMask',
  walletconnect: 'WalletConnect',
  coinbase: 'Coinbase Wallet',
}

const DECLINE_MESSAGES: Record<OrderDeclineReason, string> = {
  wallet_rejected: 'O pagamento foi recusado pela carteira. Nenhum valor foi debitado.',
  insufficient_funds: 'Saldo insuficiente na carteira para concluir a compra.',
  network_error: 'A rede não confirmou a transação. Nenhum valor foi debitado.',
}

export function toOrder(record: OrderRecord): Order {
  const {
    userId: _userId,
    idempotencyKey: _idempotencyKey,
    settleAt: _settleAt,
    outcome: _outcome,
    reserved: _reserved,
    ...order
  } = record
  return order
}

export function findOrder(userId: string, orderId: string): OrderRecord {
  const order = db.state.orders[orderId]
  if (!order) throw problems.notFound('Pedido não encontrado.')
  if (order.userId !== userId) {
    throw problems.forbidden('Este pedido pertence a outra conta.')
  }
  return order
}

export function listOrders(userId: string): OrderRecord[] {
  return Object.values(db.state.orders)
    .filter((order) => order.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function publishOrder(order: OrderRecord, options?: PublishOptions): void {
  eventBus.publish(
    {
      ...nextEvent(`order:${order.id}`, order.version),
      type: ORDER_UPDATED,
      resource: { type: 'order', id: order.id },
      userId: order.userId,
      data: {
        orderId: order.id,
        status: order.status,
        declineReason: order.declineReason,
        statusMessage: order.statusMessage,
        transaction: order.transaction,
        settledAt: order.settledAt,
        updatedAt: order.updatedAt,
      },
    },
    options,
  )
}

/**
 * Catalog change injected by the "…-at-checkout" scenarios right when the purchase
 * arrives, so the stored quote no longer matches reality.
 */
function injectCheckoutChange(cartKey: string): void {
  const change = mockConfig.get().checkoutChange
  if (change === 'none' || !mockConfig.once('checkout-change')) return
  const line = db.state.carts[cartKey]?.lines[0]
  if (!line) return

  updateNft(line.nftId, (nft) => {
    const edition = findEdition(nft, line.editionId)
    if (!edition) return
    if (change === 'price') edition.price = addEth(edition.price, '0.1')
    else edition.available = 0
  })
}

export interface CreateOrderResult {
  order: OrderRecord
  replayed: boolean
}

/**
 * Creates the order for one purchase attempt.
 *
 * Idempotency is checked first: a retry of the same attempt must return the order
 * it already created even if, by now, the cart or the prices have changed.
 */
export function createOrder(
  context: AuthContext,
  idempotencyKey: string,
  body: CreateOrderRequest,
): CreateOrderResult {
  const userId = context.user.id
  const idempotencyId = `${userId}:${idempotencyKey}`
  const requestHash = hashHex(canonicalJson(body), 24)

  const known = db.state.idempotency[idempotencyId]
  if (known) {
    const existing = db.state.orders[known.orderId]
    if (!existing || known.requestHash !== requestHash) {
      throw problems.conflict(
        'IDEMPOTENCY_KEY_REUSED',
        'Esta chave de idempotência já foi usada em outra compra.',
      )
    }
    return { order: existing, replayed: true }
  }

  // The cart keeps its items until the payment is confirmed, so a second order
  // placed meanwhile would buy the same items again.
  const pending = listOrders(userId).find((order) => order.status === 'pending')
  if (pending) {
    throw problems.conflict('ORDER_PENDING', 'Você já tem um pedido aguardando confirmação.', {
      orderId: pending.id,
    })
  }

  const cartKey = `user:${userId}`
  if ((db.state.carts[cartKey]?.lines.length ?? 0) === 0) {
    throw problems.conflict('CART_EMPTY', 'Seu carrinho está vazio.')
  }

  const connection = db.state.connections[body.connectionId]
  if (!connection || connection.userId !== userId || connection.status !== 'connected') {
    throw problems.conflict(
      'WALLET_DISCONNECTED',
      'A carteira foi desconectada. Conecte novamente para concluir a compra.',
    )
  }

  injectCheckoutChange(cartKey)

  // Revalidate against the live catalog: prices, stock, coupon and fees.
  const quote = createQuote(cartKey, body.collector.network, body.quoteFingerprint)
  if (quote.fingerprint !== body.quoteFingerprint || !quote.purchasable) {
    throw problems.conflict(
      'QUOTE_STALE',
      'Os valores do seu pedido mudaram. Revise antes de confirmar.',
      { quote: toQuoteDto(quote) },
    )
  }

  const config = mockConfig.get()
  const now = Date.now()
  const createdAt = new Date(now).toISOString()
  const id = `ord_${db.nextId('order')}`
  const reserved = quote.items.map((item) => ({
    nftId: item.nftId,
    editionId: item.editionId,
    quantity: item.quantity,
  }))

  const order: OrderRecord = {
    id,
    userId,
    idempotencyKey,
    status: 'pending',
    declineReason: null,
    statusMessage: null,
    items: quote.items.map((item) => ({
      nftId: item.nftId,
      editionId: item.editionId,
      editionLabel: item.editionLabel,
      name: item.name,
      tokenId: item.tokenId,
      artwork: item.artwork,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
    })),
    coupon: quote.coupon,
    subtotal: quote.subtotal,
    discount: quote.discount,
    networkFee: quote.networkFee,
    total: quote.total,
    network: quote.network,
    wallet: {
      id: body.walletId,
      provider: body.collector.provider,
      address: body.collector.walletAddress,
      label: PROVIDER_LABELS[body.collector.provider],
    },
    collector: {
      displayName: body.collector.displayName,
      username: body.collector.username,
      email: body.collector.email,
      profileName: body.collector.profileName,
      ens: `${body.collector.ensName}${body.collector.ensSuffix}`,
      referralCode: body.collector.referralCode,
      secondaryAddress: body.collector.secondaryAddress,
      note: body.collector.note,
    },
    transaction: null,
    createdAt,
    updatedAt: createdAt,
    settledAt: null,
    version: 1,
    settleAt: config.orderSettlement === 'manual' ? null : now + config.orderSettleDelayMs,
    outcome: config.orderSettlement === 'decline' ? 'decline' : 'confirm',
    reserved,
  }

  db.state.orders[id] = order
  db.state.idempotency[idempotencyId] = { orderId: id, requestHash }

  // Hold the stock while the payment is pending; a declined order gives it back.
  for (const item of reserved) adjustAvailability(item.nftId, item.editionId, -item.quantity)

  publishOrder(order)
  scheduleSettlement(order)
  return { order, replayed: false }
}

function scheduleSettlement(order: OrderRecord): void {
  if (order.status !== 'pending' || order.settleAt === null) return
  schedule(`order:${order.id}`, order.settleAt, () => {
    settleOrder(order.id, order.outcome === 'decline' ? 'declined' : 'confirmed')
  })
}

/** Re-arms the settlement of orders that were pending when the page reloaded. */
export function resumeSettlements(): void {
  Object.values(db.state.orders).forEach(scheduleSettlement)
}

function transactionFor(order: OrderRecord): NonNullable<Order['transaction']> {
  const hash = `0x${hashHex(`tx:${order.id}:${order.userId}`, 64)}`
  return {
    hash,
    explorerName: EXPLORERS[order.network],
    // Simulated: the explorer is an in-app page, not the real block explorer.
    explorerUrl: `/transacao/${hash}`,
  }
}

/**
 * Moves a pending order to its final state. Terminal orders are left untouched, so
 * calling it twice (timer + manual trigger) cannot flip or re-apply an outcome.
 */
export function settleOrder(
  orderId: string,
  status: 'confirmed' | 'declined',
  reason: OrderDeclineReason = 'wallet_rejected',
): OrderRecord | null {
  const order = db.state.orders[orderId]
  if (!order || order.status !== 'pending') return order ?? null
  cancel(`order:${order.id}`)

  const now = new Date().toISOString()
  order.status = status
  order.settleAt = null
  order.settledAt = now
  order.updatedAt = now
  order.version += 1

  if (status === 'confirmed') {
    order.transaction = transactionFor(order)
    // Only what was bought leaves the cart; anything added meanwhile stays.
    removePurchased(`user:${order.userId}`, order.reserved)
  } else {
    order.declineReason = reason
    order.statusMessage = DECLINE_MESSAGES[reason]
    for (const item of order.reserved) {
      adjustAvailability(item.nftId, item.editionId, item.quantity)
    }
  }
  order.reserved = []

  publishOrder(order)
  db.save()
  return order
}

/* -------------------------------------------------------------------------- */
/* Simulated block explorer                                                   */
/* -------------------------------------------------------------------------- */

export function findTransaction(userId: string, hash: string): SimulatedTransaction {
  const order = Object.values(db.state.orders).find(
    (candidate) => candidate.transaction?.hash.toLowerCase() === hash.toLowerCase(),
  )
  if (!order || !order.transaction) throw problems.notFound('Transação não encontrada.')
  if (order.userId !== userId) throw problems.forbidden('Esta transação pertence a outra conta.')
  return {
    hash: order.transaction.hash,
    orderId: order.id,
    network: order.network,
    explorerName: order.transaction.explorerName,
    from: order.wallet.address,
    to: MARKETPLACE_CONTRACT,
    value: fromWei(toWei(order.total) - toWei(order.networkFee)),
    fee: order.networkFee,
    block: 19_000_000 + (parseInt(order.id.replace(/\D/g, ''), 10) || 0),
    confirmedAt: order.settledAt ?? order.updatedAt,
  }
}
