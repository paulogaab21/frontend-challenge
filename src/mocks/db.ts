import type { EditionId, NetworkId, Order, Quote, WalletConnection } from '@/contracts'
import { type EthAmount, mulEth } from '@/lib/money'
import { readJson, removeKey, writeJson } from '@/lib/storage'

import { createCouponFixtures, createFeeFixtures, type CouponRecord } from './fixtures/coupons'
import { CATALOG_EPOCH, createNftFixtures, NFT_IDS, type NftRecord } from './fixtures/nfts'
import {
  createFavoriteFixtures,
  createUserFixtures,
  createWalletFixtures,
  USER_IDS,
  type UserRecord,
  type WalletRecord,
} from './fixtures/users'

/**
 * In-memory database of the simulated backend.
 *
 * One state object backs every REST handler and every Socket.IO event, so the
 * catalog, favorites, cart, profile, wallets and orders are always consistent with
 * each other. The state is mirrored to localStorage after each mutation: a refresh
 * keeps sessions, carts and pending orders, and `reset()` restores the seed.
 */

const DB_KEY = 'kurio.mock.db'
const SCHEMA_VERSION = 5

export interface SessionRecord {
  token: string
  userId: string
  createdAt: string
  expiresAt: string
}

export interface CartLine {
  nftId: string
  editionId: EditionId
  quantity: number
  addedAt: string
}

export interface CartRecord {
  id: string
  /** `user:<id>` or `guest:<token>`. */
  key: string
  lines: CartLine[]
  couponCode: string | null
  updatedAt: string
  version: number
}

export interface QuoteRecord extends Quote {
  cartKey: string
}

export interface OrderRecord extends Order {
  userId: string
  idempotencyKey: string
  /** Epoch ms at which the simulation settles the order; null = manual. */
  settleAt: number | null
  /** How the order will settle when `settleAt` is reached. */
  outcome: 'confirm' | 'decline'
  /** Stock held by the order while it is pending. */
  reserved: Array<{ nftId: string; editionId: EditionId; quantity: number }>
}

export interface IdempotencyRecord {
  orderId: string
  requestHash: string
}

export interface ConnectionRecord extends WalletConnection {
  userId: string
  /** Epoch ms at which the simulation drops the connection; null = never. */
  dropAt: number | null
}

export interface DbState {
  schemaVersion: number
  seededAt: number
  counters: Record<string, number>
  nfts: Record<string, NftRecord>
  /** Insertion order of the catalog (newest first). */
  nftOrder: string[]
  users: Record<string, UserRecord>
  sessions: Record<string, SessionRecord>
  favorites: Record<string, string[]>
  carts: Record<string, CartRecord>
  quotes: Record<string, QuoteRecord>
  orders: Record<string, OrderRecord>
  idempotency: Record<string, IdempotencyRecord>
  wallets: Record<string, WalletRecord>
  connections: Record<string, ConnectionRecord>
  coupons: Record<string, CouponRecord>
  fees: Record<NetworkId, EthAmount>
  /** Highest version emitted per realtime resource (`nft:<id>`, `order:<id>`...). */
  eventVersions: Record<string, number>
}

function indexBy<T>(items: T[], key: (item: T) => string): Record<string, T> {
  return Object.fromEntries(items.map((item) => [key(item), item]))
}

/**
 * A confirmed order that belongs to Bruno. It gives the scenarios two things:
 * a receipt whose prices differ from today's catalog (the snapshot never changes)
 * and a resource another user is not allowed to read (403).
 */
function seedOrder(now: number): OrderRecord {
  const createdAt = new Date(Math.min(now, CATALOG_EPOCH) - 7 * 86_400_000).toISOString()
  const unitPrice = '1.65'
  const quantity = 2
  const subtotal = mulEth(unitPrice, quantity)
  return {
    id: 'ord_1000',
    userId: USER_IDS.bruno,
    idempotencyKey: 'seed-ord-1000',
    status: 'confirmed',
    declineReason: null,
    statusMessage: null,
    items: [
      {
        nftId: NFT_IDS.ivoryBaron,
        editionId: 'fifty',
        editionLabel: '1/50',
        name: 'Ivory Baron #088',
        tokenId: '#0088',
        artwork: 'ivory-baron',
        unitPrice,
        quantity,
        lineTotal: subtotal,
      },
    ],
    coupon: null,
    subtotal,
    discount: '0',
    networkFee: '0.014',
    total: '3.314',
    network: 'ethereum',
    wallet: {
      id: null,
      provider: 'metamask',
      address: '0x3C5E7A9B1D3F5A7C9E1B3D5F7A9C2D4E6F8A0B1C',
      label: 'MetaMask',
    },
    collector: {
      displayName: 'Bruno Lima',
      username: 'bruno.lima',
      email: 'bruno@kurio.test',
      profileName: 'Bruno Lima',
      ens: 'bruno.lima.eth',
      referralCode: 'KURIO2026',
      secondaryAddress: null,
      note: null,
    },
    transaction: {
      hash: '0x4be1c07d9a3f5e2b8c6d1a0f7e4b3c2d9a8f6e5d4c3b2a1f0e9d8c7b6a5f4e3d',
      explorerName: 'Etherscan',
      // Simulated: the explorer is an in-app page, never the real block explorer.
      explorerUrl: '/transacao/0x4be1c07d9a3f5e2b8c6d1a0f7e4b3c2d9a8f6e5d4c3b2a1f0e9d8c7b6a5f4e3d',
    },
    createdAt,
    updatedAt: createdAt,
    settledAt: createdAt,
    version: 2,
    settleAt: null,
    outcome: 'confirm',
    reserved: [],
  }
}

export function createSeedState(now: number): DbState {
  const nfts = createNftFixtures()
  const order = seedOrder(now)
  return {
    schemaVersion: SCHEMA_VERSION,
    seededAt: now,
    counters: { order: 1000, quote: 0, wallet: 0, user: 0, connection: 0, event: 0, cart: 0 },
    nfts: indexBy(nfts, (nft) => nft.id),
    nftOrder: nfts.map((nft) => nft.id),
    users: indexBy(createUserFixtures(), (user) => user.id),
    sessions: {},
    favorites: createFavoriteFixtures(),
    carts: {},
    quotes: {},
    orders: { [order.id]: order },
    idempotency: {},
    wallets: indexBy(createWalletFixtures(), (wallet) => wallet.id),
    connections: {},
    coupons: indexBy(createCouponFixtures(now), (coupon) => coupon.code),
    fees: createFeeFixtures(),
    eventVersions: {},
  }
}

let state: DbState = loadState()

function loadState(): DbState {
  const stored = readJson<DbState>(DB_KEY)
  if (stored && stored.schemaVersion === SCHEMA_VERSION) return stored
  return createSeedState(Date.now())
}

export const db = {
  get state(): DbState {
    return state
  },

  /** Mirrors the state to localStorage. Called by the handlers after each mutation. */
  save(): void {
    writeJson(DB_KEY, state)
  },

  /** Restores the seed: every user-made change (and every session) is discarded. */
  reset(): void {
    state = createSeedState(Date.now())
    removeKey(DB_KEY)
    this.save()
  },

  /** Monotonic id source: `nextId('order')` → 1001, 1002... */
  nextId(counter: string): number {
    const next = (state.counters[counter] ?? 0) + 1
    state.counters[counter] = next
    return next
  },
}

export type { CouponRecord, NftRecord, UserRecord, WalletRecord }
