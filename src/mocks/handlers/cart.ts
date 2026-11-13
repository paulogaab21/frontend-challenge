import {
  addCartItemRequestSchema,
  applyCouponRequestSchema,
  createQuoteRequestSchema,
  updateCartItemRequestSchema,
} from '@/contracts'

import {
  addItem,
  applyCoupon,
  createQuote,
  getCart,
  removeCoupon,
  removeItem,
  setQuantity,
  toCartDto,
  toQuoteDto,
} from '../domain/cart'
import { route } from './route'

/**
 * The cart works for visitors (identified by X-Cart-Token) and for sessions. Every
 * mutation answers with the whole cart so the client can replace its cache entry.
 */
export const cartHandlers = [
  route('GET', '/cart', ({ cartKey }) => toCartDto(getCart(cartKey()))),

  /** 409 INSUFFICIENT_AVAILABILITY / EDITION_UNAVAILABLE when the stock does not allow it. */
  route(
    'POST',
    '/cart/items',
    async ({ cartKey, body }) => {
      const input = await body(addCartItemRequestSchema)
      return addItem(cartKey(), input.nftId, input.editionId, input.quantity)
    },
    { status: 201 },
  ),

  route<{ itemId: string }>('PATCH', '/cart/items/:itemId', async ({ cartKey, params, body }) => {
    const input = await body(updateCartItemRequestSchema)
    return setQuantity(cartKey(), decodeURIComponent(params.itemId), input.quantity)
  }),

  route<{ itemId: string }>('DELETE', '/cart/items/:itemId', ({ cartKey, params }) =>
    removeItem(cartKey(), decodeURIComponent(params.itemId)),
  ),

  /** 422 COUPON_INVALID / COUPON_EXPIRED with the message attached to `code`. */
  route('PUT', '/cart/coupon', async ({ cartKey, body }) => {
    const input = await body(applyCouponRequestSchema)
    return applyCoupon(cartKey(), input.code)
  }),

  route('DELETE', '/cart/coupon', ({ cartKey }) => removeCoupon(cartKey())),

  /**
   * Prices the cart: availability, coupon, discount, network fee and total. The
   * answer is the reference for the order (see POST /orders).
   */
  route(
    'POST',
    '/quotes',
    async ({ cartKey, body }) => {
      const input = await body(createQuoteRequestSchema)
      return toQuoteDto(createQuote(cartKey(), input.network, input.previousFingerprint))
    },
    { status: 201 },
  ),
]
