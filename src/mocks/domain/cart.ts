import {
  type AppliedCoupon,
  type Cart,
  type CartItem,
  type EditionId,
  type NetworkId,
  type Quote,
  type QuoteIssue,
} from '@/contracts'
import {
  addEth,
  compareEth,
  formatEth,
  minEth,
  mulEth,
  percentOfEth,
  subEth,
  type EthAmount,
} from '@/lib/money'

import { db, type CartLine, type CartRecord, type CouponRecord, type QuoteRecord } from '../db'
import { canonicalJson, hashHex } from '../lib/random'
import { findEdition, findNft } from './catalog'
import { HttpProblem, problems } from './problem'

const QUOTE_TTL_MS = 5 * 60_000
const QUOTES_KEPT_PER_CART = 5

export function lineId(nftId: string, editionId: EditionId): string {
  return `${nftId}:${editionId}`
}

export function getCart(key: string): CartRecord {
  const existing = db.state.carts[key]
  if (existing) return existing
  const created: CartRecord = {
    id: `cart_${String(db.nextId('cart')).padStart(4, '0')}`,
    key,
    lines: [],
    couponCode: null,
    updatedAt: new Date().toISOString(),
    version: 1,
  }
  db.state.carts[key] = created
  return created
}

function touch(cart: CartRecord): void {
  cart.version += 1
  cart.updatedAt = new Date().toISOString()
}

/** Resolves a line against the live catalog. Lines of removed NFTs are dropped. */
function toItem(line: CartLine): CartItem | null {
  const nft = db.state.nfts[line.nftId]
  const edition = nft ? findEdition(nft, line.editionId) : undefined
  if (!nft || !edition) return null
  return {
    id: lineId(line.nftId, line.editionId),
    nftId: nft.id,
    editionId: edition.id,
    editionLabel: edition.label,
    name: nft.name,
    tokenId: nft.tokenId,
    artwork: nft.artwork,
    network: nft.network,
    unitPrice: edition.price,
    quantity: line.quantity,
    lineTotal: mulEth(edition.price, line.quantity),
    available: edition.available,
    maxQuantity: Math.min(edition.available, edition.maxPerOrder),
    nftVersion: nft.version,
  }
}

export function toCartDto(cart: CartRecord): Cart {
  const items = cart.lines.flatMap((line) => toItem(line) ?? [])
  return {
    id: cart.id,
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    couponCode: cart.couponCode,
    updatedAt: cart.updatedAt,
    version: cart.version,
  }
}

function availabilityProblem(name: string, label: string, max: number): HttpProblem {
  if (max <= 0) {
    return problems.conflict('EDITION_UNAVAILABLE', `A edição ${label} de ${name} está esgotada.`, {
      available: 0,
    })
  }
  return problems.conflict(
    'INSUFFICIENT_AVAILABILITY',
    max === 1
      ? `Só há 1 unidade disponível da edição ${label} de ${name}.`
      : `Você pode levar no máximo ${max} unidades da edição ${label} de ${name}.`,
    { available: max },
  )
}

/** Adds to the existing line when the edition is already in the cart. */
export function addItem(key: string, nftId: string, editionId: EditionId, quantity: number): Cart {
  const nft = findNft(nftId)
  const edition = findEdition(nft, editionId)
  if (!edition) throw problems.notFound('Esta edição não existe para o NFT selecionado.')

  const cart = getCart(key)
  const line = cart.lines.find((item) => item.nftId === nftId && item.editionId === editionId)
  const wanted = (line?.quantity ?? 0) + quantity
  const max = Math.min(edition.available, edition.maxPerOrder)
  if (wanted > max) throw availabilityProblem(nft.name, edition.label, max)

  if (line) line.quantity = wanted
  else cart.lines.push({ nftId, editionId, quantity, addedAt: new Date().toISOString() })
  touch(cart)
  return toCartDto(cart)
}

export function setQuantity(key: string, itemId: string, quantity: number): Cart {
  const cart = getCart(key)
  const line = cart.lines.find((item) => lineId(item.nftId, item.editionId) === itemId)
  if (!line) throw problems.notFound('Este item não está mais no carrinho.')

  const nft = findNft(line.nftId)
  const edition = findEdition(nft, line.editionId)
  const max = edition ? Math.min(edition.available, edition.maxPerOrder) : 0
  // Lowering the quantity is always allowed, even below a now-smaller stock.
  if (quantity > line.quantity && quantity > max) {
    throw availabilityProblem(nft.name, edition?.label ?? '', max)
  }

  line.quantity = quantity
  touch(cart)
  return toCartDto(cart)
}

export function removeItem(key: string, itemId: string): Cart {
  const cart = getCart(key)
  const before = cart.lines.length
  cart.lines = cart.lines.filter((item) => lineId(item.nftId, item.editionId) !== itemId)
  // Removing an item that is already gone is a success: the operation is idempotent.
  if (cart.lines.length !== before) {
    if (cart.lines.length === 0) cart.couponCode = null
    touch(cart)
  }
  return toCartDto(cart)
}

/**
 * Moves the visitor's lines into the user's cart when a session starts. Quantities
 * of the same edition add up, capped by what can actually be bought.
 */
export function mergeGuestCart(guestKey: string, userKey: string): void {
  const guest = db.state.carts[guestKey]
  if (!guest) return
  if (guest.lines.length > 0) {
    const cart = getCart(userKey)
    for (const line of guest.lines) {
      const nft = db.state.nfts[line.nftId]
      const edition = nft ? findEdition(nft, line.editionId) : undefined
      if (!edition) continue
      const max = Math.max(1, Math.min(edition.available, edition.maxPerOrder))
      const existing = cart.lines.find(
        (item) => item.nftId === line.nftId && item.editionId === line.editionId,
      )
      if (existing) existing.quantity = Math.min(existing.quantity + line.quantity, max)
      else cart.lines.push({ ...line, quantity: Math.min(line.quantity, max) })
    }
    cart.couponCode = cart.couponCode ?? guest.couponCode
    touch(cart)
  }
  delete db.state.carts[guestKey]
}

/* -------------------------------------------------------------------------- */
/* Coupons                                                                    */
/* -------------------------------------------------------------------------- */

type CouponCheck = { ok: true; coupon: CouponRecord } | { ok: false; reason: 'invalid' | 'expired' }

function checkCoupon(code: string): CouponCheck {
  const coupon = db.state.coupons[code.trim().toUpperCase()]
  if (!coupon) return { ok: false, reason: 'invalid' }
  if (coupon.expiresAt && Date.parse(coupon.expiresAt) <= Date.now()) {
    return { ok: false, reason: 'expired' }
  }
  return { ok: true, coupon }
}

export function applyCoupon(key: string, code: string): Cart {
  const cart = getCart(key)
  if (cart.lines.length === 0) {
    throw problems.conflict('CART_EMPTY', 'Adicione um NFT ao carrinho antes de aplicar um código.')
  }
  const check = checkCoupon(code)
  if (!check.ok) {
    const message =
      check.reason === 'expired'
        ? 'Este código promocional expirou.'
        : 'Código promocional inválido.'
    throw new HttpProblem(
      422,
      check.reason === 'expired' ? 'COUPON_EXPIRED' : 'COUPON_INVALID',
      message,
      {
        fieldErrors: { code: [message] },
      },
    )
  }
  cart.couponCode = check.coupon.code
  touch(cart)
  return toCartDto(cart)
}

export function removeCoupon(key: string): Cart {
  const cart = getCart(key)
  if (cart.couponCode) {
    cart.couponCode = null
    touch(cart)
  }
  return toCartDto(cart)
}

function discountFor(coupon: CouponRecord, subtotal: EthAmount): EthAmount {
  if (coupon.minSubtotal && compareEth(subtotal, coupon.minSubtotal) < 0) return '0'
  if (coupon.basisPoints !== null) return percentOfEth(subtotal, coupon.basisPoints)
  return coupon.amount ? minEth(coupon.amount, subtotal) : '0'
}

/* -------------------------------------------------------------------------- */
/* Quote                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Prices the cart right now. The fingerprint covers everything that changes what
 * the collector pays or can buy; `previousFingerprint` lets the API describe what
 * changed since the quote the client is showing.
 */
export function createQuote(
  key: string,
  network: NetworkId = 'ethereum',
  previousFingerprint?: string,
): QuoteRecord {
  const cart = getCart(key)
  const now = Date.now()
  const items = cart.lines.flatMap((line) => toItem(line) ?? [])
  const issues: QuoteIssue[] = []

  if (items.length !== cart.lines.length) {
    cart.lines = cart.lines.filter((line) => toItem(line) !== null)
    issues.push({
      type: 'item_removed',
      blocking: false,
      message: 'Um item do carrinho não está mais à venda e foi removido.',
    })
    touch(cart)
  }

  for (const item of items) {
    if (item.available === 0) {
      issues.push({
        type: 'edition_unavailable',
        blocking: true,
        itemId: item.id,
        nftId: item.nftId,
        message: `A edição ${item.editionLabel} de ${item.name} esgotou. Remova o item para continuar.`,
        current: '0',
      })
    } else if (item.quantity > item.maxQuantity) {
      issues.push({
        type: 'insufficient_availability',
        blocking: true,
        itemId: item.id,
        nftId: item.nftId,
        message:
          item.maxQuantity === 1
            ? `Resta apenas 1 unidade da edição ${item.editionLabel} de ${item.name}.`
            : `Restam apenas ${item.maxQuantity} unidades da edição ${item.editionLabel} de ${item.name}.`,
        previous: String(item.quantity),
        current: String(item.maxQuantity),
      })
    }
  }

  const subtotal = addEth('0', ...items.map((item) => item.lineTotal))

  let coupon: AppliedCoupon | null = null
  let discount: EthAmount = '0'
  if (cart.couponCode) {
    const check = checkCoupon(cart.couponCode)
    if (check.ok) {
      coupon = { code: check.coupon.code, description: check.coupon.description }
      discount = discountFor(check.coupon, subtotal)
    } else {
      // The coupon stopped being valid after it was applied: drop it and say so.
      issues.push({
        type: check.reason === 'expired' ? 'coupon_expired' : 'coupon_invalid',
        blocking: false,
        message: `O código ${cart.couponCode} ${check.reason === 'expired' ? 'expirou' : 'não é mais válido'} e foi removido do carrinho.`,
        previous: cart.couponCode,
      })
      cart.couponCode = null
      touch(cart)
    }
  }

  const networkFee = items.length > 0 ? db.state.fees[network] : '0'
  const total = addEth(subEth(subtotal, discount), networkFee)

  const fingerprint = hashHex(
    canonicalJson({
      network,
      lines: items.map((item) => [
        item.id,
        item.quantity,
        item.unitPrice,
        item.quantity <= item.maxQuantity,
      ]),
      coupon: coupon?.code ?? null,
      discount,
      networkFee,
    }),
    24,
  )

  if (previousFingerprint && previousFingerprint !== fingerprint) {
    issues.push(...describeChanges(key, previousFingerprint, items, networkFee))
  }

  const quote: QuoteRecord = {
    id: `quo_${String(db.nextId('quote')).padStart(5, '0')}`,
    cartKey: key,
    fingerprint,
    network,
    items,
    coupon,
    subtotal,
    discount,
    networkFee,
    total,
    purchasable: items.length > 0 && issues.every((issue) => !issue.blocking),
    issues,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + QUOTE_TTL_MS).toISOString(),
  }

  db.state.quotes[quote.id] = quote
  pruneQuotes(key)
  return quote
}

/** Differences in price and fee between the client's previous quote and now. */
function describeChanges(
  key: string,
  previousFingerprint: string,
  items: CartItem[],
  networkFee: EthAmount,
): QuoteIssue[] {
  const previous = Object.values(db.state.quotes)
    .filter((quote) => quote.cartKey === key && quote.fingerprint === previousFingerprint)
    .at(-1)
  if (!previous) return []

  const changes: QuoteIssue[] = []
  for (const item of items) {
    const before = previous.items.find((entry) => entry.id === item.id)
    if (before && before.unitPrice !== item.unitPrice) {
      changes.push({
        type: 'price_changed',
        blocking: false,
        itemId: item.id,
        nftId: item.nftId,
        message: `O preço de ${item.name} mudou de ${formatEth(before.unitPrice)} para ${formatEth(item.unitPrice)}.`,
        previous: before.unitPrice,
        current: item.unitPrice,
      })
    }
  }
  if (previous.items.length > 0 && items.length > 0 && previous.networkFee !== networkFee) {
    changes.push({
      type: 'fee_changed',
      blocking: false,
      message: `A taxa de rede mudou de ${formatEth(previous.networkFee, { minFractionDigits: 3 })} para ${formatEth(networkFee, { minFractionDigits: 3 })}.`,
      previous: previous.networkFee,
      current: networkFee,
    })
  }
  return changes
}

function pruneQuotes(key: string): void {
  const own = Object.values(db.state.quotes).filter((quote) => quote.cartKey === key)
  for (const stale of own.slice(0, Math.max(0, own.length - QUOTES_KEPT_PER_CART))) {
    delete db.state.quotes[stale.id]
  }
}

export function toQuoteDto(record: QuoteRecord): Quote {
  const { cartKey: _cartKey, ...quote } = record
  return quote
}

/** Removes from the cart exactly what an order bought, keeping everything else. */
export function removePurchased(
  key: string,
  purchased: Array<{ nftId: string; editionId: EditionId; quantity: number }>,
): void {
  const cart = db.state.carts[key]
  if (!cart) return
  for (const bought of purchased) {
    const line = cart.lines.find(
      (item) => item.nftId === bought.nftId && item.editionId === bought.editionId,
    )
    if (line) line.quantity -= bought.quantity
  }
  cart.lines = cart.lines.filter((line) => line.quantity > 0)
  if (cart.lines.length === 0) cart.couponCode = null
  touch(cart)
}
