import { z } from 'zod'

/**
 * Contracts shared by the three layers: transport (Axios / Socket.IO), server state
 * (TanStack Query cache) and UI. The mock server (MSW) imports the same schemas, so a
 * contract change breaks the build on both sides.
 */

/** ETH amount as a decimal string — see src/lib/money.ts. */
export const ethAmountSchema = z
  .string()
  .regex(/^\d+(\.\d{1,18})?$/, 'Valor em ETH inválido')
  .describe('ETH amount as a decimal string')

export const isoDateSchema = z.iso.datetime({ offset: true })

/** Monotonic per-resource counter. Lets clients discard stale responses and events. */
export const versionSchema = z.number().int().nonnegative()

export const networkIdSchema = z.enum(['ethereum', 'polygon', 'solana'])
export type NetworkId = z.infer<typeof networkIdSchema>

export const walletProviderSchema = z.enum(['metamask', 'walletconnect', 'coinbase'])
export type WalletProvider = z.infer<typeof walletProviderSchema>

export const categoryIdSchema = z.enum([
  'arte-digital',
  'fotografia',
  'musica',
  'arte-3d',
  'colecionaveis',
  'generativa',
  'jogos',
  'assinaturas',
  'utilidade',
])
export type CategoryId = z.infer<typeof categoryIdSchema>

export const artworkIdSchema = z.enum(['emerald-ape', 'violet-nomad', 'ivory-baron', 'golden-beat'])
export type ArtworkId = z.infer<typeof artworkIdSchema>

/* -------------------------------------------------------------------------- */
/* Errors                                                                     */
/* -------------------------------------------------------------------------- */

export const apiErrorCodeSchema = z.enum([
  // 400 / 422
  'VALIDATION_ERROR',
  'COUPON_INVALID',
  'COUPON_EXPIRED',
  'WRONG_PASSWORD',
  // 401
  'UNAUTHENTICATED',
  'SESSION_EXPIRED',
  'INVALID_CREDENTIALS',
  // 403
  'FORBIDDEN',
  'WALLET_CONNECTION_REJECTED',
  // 404
  'NOT_FOUND',
  // 409
  'EMAIL_TAKEN',
  'USERNAME_TAKEN',
  'WALLET_ROLE_TAKEN',
  'WALLET_ADDRESS_TAKEN',
  'INSUFFICIENT_AVAILABILITY',
  'EDITION_UNAVAILABLE',
  'QUOTE_STALE',
  'QUOTE_EXPIRED',
  'CART_EMPTY',
  'IDEMPOTENCY_KEY_REUSED',
  'WALLET_DISCONNECTED',
  // 5xx
  'INTERNAL_ERROR',
  'SERVICE_UNAVAILABLE',
])
export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>

/**
 * Error envelope returned by every non-2xx response.
 * `fieldErrors` maps a request field to the messages to render next to it.
 */
export const apiErrorSchema = z.object({
  code: apiErrorCodeSchema,
  message: z.string(),
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
  details: z.unknown().optional(),
  requestId: z.string().optional(),
})
export type ApiErrorBody = z.infer<typeof apiErrorSchema>

export function paginatedSchema<T extends z.ZodType>(item: T) {
  return z.object({
    items: z.array(item),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    totalItems: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  })
}
