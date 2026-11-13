import { z } from 'zod'

import { ethAmountSchema, isoDateSchema, versionSchema } from './common'
import { editionSchema } from './nft'
import { orderDeclineReasonSchema, orderStatusSchema, orderTransactionSchema } from './order'
import { walletConnectionStatusSchema } from './wallet'

/**
 * Socket.IO contract (namespace "/").
 *
 * Every server → client event shares one envelope:
 * - `id`        stable identity of the event; a redelivery carries the same id.
 * - `resource`  what changed.
 * - `version`   monotonic version of that resource *after* the change. Clients keep
 *               the highest version applied per resource and drop anything lower or
 *               equal, so duplicates and late events can never regress the UI.
 * - `userId`    present on private events; the client drops events addressed to a
 *               different user than the one of the current session.
 */

export const NFT_UPDATED = 'nft.updated'
export const ORDER_UPDATED = 'order.updated'
export const WALLET_UPDATED = 'wallet.updated'

const envelope = {
  id: z.string(),
  version: versionSchema,
  occurredAt: isoDateSchema,
}

export const nftUpdatedEventSchema = z.object({
  ...envelope,
  type: z.literal(NFT_UPDATED),
  resource: z.object({ type: z.literal('nft'), id: z.string() }),
  data: z.object({
    nftId: z.string(),
    name: z.string(),
    /** Price of the default edition (the card price). */
    price: ethAmountSchema,
    previousPrice: ethAmountSchema,
    compareAtPrice: ethAmountSchema.nullable(),
    /** Total units available across editions. */
    available: z.number().int().nonnegative(),
    previousAvailable: z.number().int().nonnegative(),
    editions: z.array(editionSchema),
  }),
})
export type NftUpdatedEvent = z.infer<typeof nftUpdatedEventSchema>

export const orderUpdatedEventSchema = z.object({
  ...envelope,
  type: z.literal(ORDER_UPDATED),
  resource: z.object({ type: z.literal('order'), id: z.string() }),
  userId: z.string(),
  data: z.object({
    orderId: z.string(),
    status: orderStatusSchema,
    declineReason: orderDeclineReasonSchema.nullable(),
    statusMessage: z.string().nullable(),
    /** Present once the order is confirmed — everything the receipt needs. */
    transaction: orderTransactionSchema.nullable(),
    settledAt: isoDateSchema.nullable(),
    updatedAt: isoDateSchema,
  }),
})
export type OrderUpdatedEvent = z.infer<typeof orderUpdatedEventSchema>

export const walletUpdatedEventSchema = z.object({
  ...envelope,
  type: z.literal(WALLET_UPDATED),
  resource: z.object({ type: z.literal('wallet-connection'), id: z.string() }),
  userId: z.string(),
  data: z.object({
    connectionId: z.string(),
    walletId: z.string().nullable(),
    status: walletConnectionStatusSchema,
  }),
})
export type WalletUpdatedEvent = z.infer<typeof walletUpdatedEventSchema>

export type RealtimeEvent = NftUpdatedEvent | OrderUpdatedEvent | WalletUpdatedEvent

/** Typed maps for socket.io-client's generics. */
export interface ServerToClientEvents {
  [NFT_UPDATED]: (event: NftUpdatedEvent) => void
  [ORDER_UPDATED]: (event: OrderUpdatedEvent) => void
  [WALLET_UPDATED]: (event: WalletUpdatedEvent) => void
}

/** The client only authenticates through the handshake; it emits no events. */
export type ClientToServerEvents = Record<string, never>

/** Payload of the Socket.IO handshake (`auth` option of the client). */
export const socketAuthSchema = z.object({
  token: z.string().nullable(),
})
export type SocketAuth = z.infer<typeof socketAuthSchema>
