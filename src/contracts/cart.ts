import { z } from 'zod'

import {
  artworkIdSchema,
  ethAmountSchema,
  isoDateSchema,
  networkIdSchema,
  versionSchema,
} from './common'
import { editionIdSchema } from './nft'

/* -------------------------------------------------------------------------- */
/* Cart                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * A cart line is identified by NFT + edition. Prices are always the current
 * catalog prices: the API never returns a price the order could not be placed at.
 */
export const cartItemSchema = z.object({
  /** `${nftId}:${editionId}` */
  id: z.string(),
  nftId: z.string(),
  editionId: editionIdSchema,
  editionLabel: z.string(),
  name: z.string(),
  tokenId: z.string(),
  artwork: artworkIdSchema,
  network: networkIdSchema,
  unitPrice: ethAmountSchema,
  quantity: z.number().int().positive(),
  lineTotal: ethAmountSchema,
  /** Units of this edition still purchasable (0 = sold out). */
  available: z.number().int().nonnegative(),
  /** Highest quantity the API accepts for this line right now. */
  maxQuantity: z.number().int().nonnegative(),
  /** Version of the NFT the line was priced against. */
  nftVersion: versionSchema,
})
export type CartItem = z.infer<typeof cartItemSchema>

/** GET /cart and the response of every cart mutation. */
export const cartSchema = z.object({
  id: z.string(),
  items: z.array(cartItemSchema),
  /** Sum of quantities — the number on the header badge. */
  itemCount: z.number().int().nonnegative(),
  couponCode: z.string().nullable(),
  updatedAt: isoDateSchema,
  version: versionSchema,
})
export type Cart = z.infer<typeof cartSchema>

/** POST /cart/items — adds to the existing line when the edition is already there. */
export const addCartItemRequestSchema = z.object({
  nftId: z.string().min(1),
  editionId: editionIdSchema,
  quantity: z.number().int().positive(),
})
export type AddCartItemRequest = z.infer<typeof addCartItemRequestSchema>

/** PATCH /cart/items/:itemId */
export const updateCartItemRequestSchema = z.object({
  quantity: z.number().int().positive(),
})
export type UpdateCartItemRequest = z.infer<typeof updateCartItemRequestSchema>

/** PUT /cart/coupon */
export const applyCouponRequestSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(1, 'Informe o código promocional')
    .max(24, 'Código muito longo'),
})
export type ApplyCouponRequest = z.infer<typeof applyCouponRequestSchema>

/* -------------------------------------------------------------------------- */
/* Quote                                                                      */
/* -------------------------------------------------------------------------- */

export const quoteItemSchema = cartItemSchema
export type QuoteItem = z.infer<typeof quoteItemSchema>

export const quoteIssueTypeSchema = z.enum([
  'price_changed',
  'insufficient_availability',
  'edition_unavailable',
  'coupon_expired',
  'coupon_invalid',
  'fee_changed',
  'item_removed',
])
export type QuoteIssueType = z.infer<typeof quoteIssueTypeSchema>

/**
 * Something the collector must know before confirming: a difference against the
 * previous quote (`previous` → `current`) or a problem that blocks the purchase.
 */
export const quoteIssueSchema = z.object({
  type: quoteIssueTypeSchema,
  /** True when the order cannot be placed until the cart is fixed. */
  blocking: z.boolean(),
  message: z.string(),
  itemId: z.string().optional(),
  nftId: z.string().optional(),
  previous: z.string().optional(),
  current: z.string().optional(),
})
export type QuoteIssue = z.infer<typeof quoteIssueSchema>

export const appliedCouponSchema = z.object({
  code: z.string(),
  description: z.string(),
})
export type AppliedCoupon = z.infer<typeof appliedCouponSchema>

/**
 * The priced snapshot of the cart. It is the only source of monetary values in the
 * UI and the reference the order is created against.
 */
export const quoteSchema = z.object({
  id: z.string(),
  /**
   * Hash of everything that affects the total (lines, prices, availability status,
   * coupon, fee). Two quotes with the same fingerprint are interchangeable.
   */
  fingerprint: z.string(),
  network: networkIdSchema,
  items: z.array(quoteItemSchema),
  coupon: appliedCouponSchema.nullable(),
  subtotal: ethAmountSchema,
  discount: ethAmountSchema,
  networkFee: ethAmountSchema,
  total: ethAmountSchema,
  /** False when at least one blocking issue exists or the cart is empty. */
  purchasable: z.boolean(),
  issues: z.array(quoteIssueSchema),
  createdAt: isoDateSchema,
  expiresAt: isoDateSchema,
})
export type Quote = z.infer<typeof quoteSchema>

/** POST /quotes */
export const createQuoteRequestSchema = z.object({
  /** Network the order will be settled on; drives the network fee. */
  network: networkIdSchema.optional(),
  /** Fingerprint of the quote the client is showing, to get the list of changes. */
  previousFingerprint: z.string().optional(),
})
export type CreateQuoteRequest = z.infer<typeof createQuoteRequestSchema>
