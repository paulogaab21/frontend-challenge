import { z } from 'zod'

import { emailSchema, usernameSchema } from './auth'
import {
  artworkIdSchema,
  ethAmountSchema,
  isoDateSchema,
  networkIdSchema,
  paginatedSchema,
  versionSchema,
  walletProviderSchema,
} from './common'
import { appliedCouponSchema, quoteSchema } from './cart'
import { editionIdSchema } from './nft'
import { displayNameSchema, ensNameSchema, ensSuffixSchema } from './profile'
import { addressHint, isValidAddress } from './wallet'

export const orderStatusSchema = z.enum(['pending', 'confirmed', 'declined'])
export type OrderStatus = z.infer<typeof orderStatusSchema>

/** `confirmed` and `declined` are terminal: an order never leaves them. */
export function isTerminalOrderStatus(status: OrderStatus): boolean {
  return status !== 'pending'
}

export const orderDeclineReasonSchema = z.enum([
  'wallet_rejected',
  'insufficient_funds',
  'network_error',
])
export type OrderDeclineReason = z.infer<typeof orderDeclineReasonSchema>

/* -------------------------------------------------------------------------- */
/* Collector data (the "Perfil do colecionador" form of the payment screen)   */
/* -------------------------------------------------------------------------- */

export const collectorSchema = z
  .object({
    displayName: displayNameSchema,
    username: usernameSchema,
    network: networkIdSchema,
    profileName: z
      .string()
      .trim()
      .min(2, 'Use pelo menos 2 caracteres')
      .max(40, 'Use no máximo 40 caracteres'),
    walletAddress: z.string().trim().min(1, 'Informe o endereço da carteira'),
    secondaryAddress: z
      .string()
      .trim()
      .max(64, 'Use no máximo 64 caracteres')
      .nullable()
      .transform((value) => (value ? value : null)),
    provider: walletProviderSchema,
    referralCode: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9]{4,12}$/, 'Use de 4 a 12 letras ou números'),
    email: emailSchema,
    ensName: ensNameSchema,
    ensSuffix: ensSuffixSchema,
    note: z
      .string()
      .trim()
      .max(280, 'Use no máximo 280 caracteres')
      .nullable()
      .transform((value) => (value ? value : null)),
  })
  .superRefine((value, ctx) => {
    if (value.walletAddress && !isValidAddress(value.walletAddress, value.network)) {
      ctx.addIssue({
        code: 'custom',
        path: ['walletAddress'],
        message: addressHint(value.network),
      })
    }
  })
export type Collector = z.infer<typeof collectorSchema>
export type CollectorInput = z.input<typeof collectorSchema>

/* -------------------------------------------------------------------------- */
/* Resource                                                                   */
/* -------------------------------------------------------------------------- */

/** Line of the receipt. A frozen copy: later catalog changes never touch it. */
export const orderItemSchema = z.object({
  nftId: z.string(),
  editionId: editionIdSchema,
  editionLabel: z.string(),
  name: z.string(),
  tokenId: z.string(),
  artwork: artworkIdSchema,
  unitPrice: ethAmountSchema,
  quantity: z.number().int().positive(),
  lineTotal: ethAmountSchema,
})
export type OrderItem = z.infer<typeof orderItemSchema>

export const orderSchema = z.object({
  id: z.string(),
  status: orderStatusSchema,
  declineReason: orderDeclineReasonSchema.nullable(),
  /** Human readable explanation for `declined`. */
  statusMessage: z.string().nullable(),
  items: z.array(orderItemSchema),
  coupon: appliedCouponSchema.nullable(),
  subtotal: ethAmountSchema,
  discount: ethAmountSchema,
  networkFee: ethAmountSchema,
  total: ethAmountSchema,
  network: networkIdSchema,
  wallet: z.object({
    id: z.string().nullable(),
    provider: walletProviderSchema,
    address: z.string(),
    label: z.string(),
  }),
  collector: z.object({
    displayName: z.string(),
    username: z.string(),
    email: z.string(),
    profileName: z.string(),
    ens: z.string(),
    referralCode: z.string(),
    secondaryAddress: z.string().nullable(),
    note: z.string().nullable(),
  }),
  /** Simulated on-chain reference; present only once the order is confirmed. */
  transaction: z
    .object({
      hash: z.string(),
      explorerName: z.string(),
      explorerUrl: z.string(),
    })
    .nullable(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
  settledAt: isoDateSchema.nullable(),
  version: versionSchema,
})
export type Order = z.infer<typeof orderSchema>

/** GET /orders */
export const orderListResponseSchema = paginatedSchema(orderSchema)
export type OrderListResponse = z.infer<typeof orderListResponseSchema>

/* -------------------------------------------------------------------------- */
/* Requests                                                                   */
/* -------------------------------------------------------------------------- */

/** Header carrying the client-generated key of one purchase attempt. */
export const IDEMPOTENCY_HEADER = 'Idempotency-Key'
/** Response header set to "true" when an existing order was returned for the key. */
export const IDEMPOTENT_REPLAY_HEADER = 'Idempotent-Replayed'

/**
 * POST /orders
 *
 * - The same key with the same body returns the order created by the first call
 *   (200 + `Idempotent-Replayed: true`), whatever its current status.
 * - The same key with a different body is rejected with 409 IDEMPOTENCY_KEY_REUSED.
 * - `quoteFingerprint` must match the quote the API computes at that instant;
 *   otherwise 409 QUOTE_STALE carries the fresh quote in `details`.
 */
export const createOrderRequestSchema = z.object({
  quoteId: z.string().min(1),
  quoteFingerprint: z.string().min(1),
  /** Registered wallet used to pay; null when the collector typed another wallet. */
  walletId: z.string().nullable(),
  /** Connection obtained from POST /wallet-connections. */
  connectionId: z.string().min(1),
  collector: collectorSchema,
})
export type CreateOrderRequest = z.infer<typeof createOrderRequestSchema>
export type CreateOrderInput = z.input<typeof createOrderRequestSchema>

/** `details` of the 409 QUOTE_STALE error. */
export const quoteStaleDetailsSchema = z.object({
  quote: quoteSchema,
})
export type QuoteStaleDetails = z.infer<typeof quoteStaleDetailsSchema>

/**
 * GET /transactions/:hash — entry of the simulated block explorer. Nothing here
 * exists on a real chain: hashes, blocks and addresses are generated by the API.
 */
export const simulatedTransactionSchema = z.object({
  hash: z.string(),
  orderId: z.string(),
  network: networkIdSchema,
  explorerName: z.string(),
  from: z.string(),
  to: z.string(),
  /** Amount transferred to the marketplace contract (total minus network fee). */
  value: ethAmountSchema,
  fee: ethAmountSchema,
  block: z.number().int().positive(),
  confirmedAt: isoDateSchema,
})
export type SimulatedTransaction = z.infer<typeof simulatedTransactionSchema>
