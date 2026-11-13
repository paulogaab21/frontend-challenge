import type { NetworkId, NftListParams } from '@/contracts'

/**
 * Every TanStack Query key of the app, in one place.
 *
 * Two families:
 * - **public** keys (`nfts`) are shared by everyone and survive sign in/out;
 * - **private** keys start with `['private', scope]`, where `scope` identifies who
 *   the data belongs to (`user:<id>` or `guest:<cart token>`). Two identities can
 *   never read each other's cache entry, and ending a session wipes the whole
 *   `['private']` subtree in one call.
 */
export const queryKeys = {
  nfts: {
    all: ['nfts'] as const,
    lists: () => ['nfts', 'list'] as const,
    list: (params: NftListParams) => ['nfts', 'list', params] as const,
    details: () => ['nfts', 'detail'] as const,
    detail: (nftId: string) => ['nfts', 'detail', nftId] as const,
  },

  private: {
    all: ['private'] as const,
    scope: (scope: string) => ['private', scope] as const,
    session: (scope: string) => ['private', scope, 'session'] as const,
    cart: (scope: string) => ['private', scope, 'cart'] as const,
    quotes: (scope: string) => ['private', scope, 'quote'] as const,
    quote: (scope: string, network: NetworkId, cartVersion: number) =>
      ['private', scope, 'quote', network, cartVersion] as const,
    favorites: (scope: string) => ['private', scope, 'favorites'] as const,
    profile: (scope: string) => ['private', scope, 'profile'] as const,
    wallets: (scope: string) => ['private', scope, 'wallets'] as const,
    connection: (scope: string) => ['private', scope, 'wallet-connection'] as const,
    orders: (scope: string) => ['private', scope, 'orders'] as const,
    order: (scope: string, orderId: string) => ['private', scope, 'orders', orderId] as const,
    transaction: (scope: string, hash: string) => ['private', scope, 'transactions', hash] as const,
  },
}
