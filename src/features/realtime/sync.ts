import { type QueryClient, type QueryKey } from '@tanstack/react-query'

import {
  NFT_UPDATED,
  ORDER_UPDATED,
  WALLET_UPDATED,
  type ActiveConnectionResponse,
  type Cart,
  type CartItem,
  type FavoritesResponse,
  type NftDetail,
  type NftListResponse,
  type NftSummary,
  type NftUpdatedEvent,
  type Order,
  type OrderUpdatedEvent,
  type WalletUpdatedEvent,
} from '@/contracts'
import { refreshCart } from '@/features/cart/queries'
import { formatEth } from '@/lib/money'
import { notify } from '@/lib/notify'
import { queryKeys } from '@/lib/query-keys'
import { realtime } from '@/lib/realtime/client'
import { currentScope } from '@/lib/session-store'

/**
 * Reconciliation between Socket.IO and the REST cache.
 *
 * Events never reach components directly. Each accepted event (the realtime client
 * has already discarded duplicates, stale versions and other users' events) is
 * turned into cache writes, so every screen that reads the affected resource
 * updates through the same path as a REST response:
 *
 *   socket.io-client → event guard → this module → TanStack Query cache → UI
 *
 * Two kinds of writes are used:
 * - **patch**: fields carried by the event are written in place (instant);
 * - **invalidate**: resources the event cannot describe completely (sort order of
 *   a list, the user's cart and its quote) are refetched from the API.
 *
 * Every patch is version-checked against the cached entry, so a REST response
 * that is already newer is never overwritten by the event.
 */

function isObserved(queryClient: QueryClient, queryKey: QueryKey): boolean {
  return (queryClient.getQueryCache().find({ queryKey })?.getObserversCount() ?? 0) > 0
}

/* -------------------------------------------------------------------------- */
/* nft.updated                                                                */
/* -------------------------------------------------------------------------- */

function patchSummary<T extends NftSummary>(nft: T, event: NftUpdatedEvent): T {
  if (nft.id !== event.data.nftId || nft.version >= event.version) return nft
  return {
    ...nft,
    price: event.data.price,
    compareAtPrice: event.data.compareAtPrice,
    available: event.data.available,
    version: event.version,
  }
}

function describeCartChange(before: CartItem, after: CartItem): string | null {
  if (before.available > 0 && after.available === 0) {
    return `${after.name} (edição ${after.editionLabel}) esgotou.`
  }
  if (before.unitPrice !== after.unitPrice) {
    return `O preço de ${after.name} mudou de ${formatEth(before.unitPrice)} para ${formatEth(after.unitPrice)}.`
  }
  if (after.quantity > after.maxQuantity && before.quantity <= before.maxQuantity) {
    return after.maxQuantity === 1
      ? `Resta apenas 1 unidade de ${after.name}.`
      : `Restam apenas ${after.maxQuantity} unidades de ${after.name}.`
  }
  if (before.available === 0 && after.available > 0) {
    return `${after.name} está disponível novamente.`
  }
  return null
}

/**
 * The cart is priced by the API, so it is refetched rather than patched; the
 * collector is told what changed by comparing the lines before and after.
 */
async function syncCart(queryClient: QueryClient, event: NftUpdatedEvent): Promise<boolean> {
  const scope = currentScope()
  const key = queryKeys.private.cart(scope)
  const before = queryClient
    .getQueryData<Cart>(key)
    ?.items.filter((item) => item.nftId === event.data.nftId)
  if (!before?.length) return false

  await refreshCart(queryClient, scope)
  if (currentScope() !== scope) return true

  const after = queryClient.getQueryData<Cart>(key)
  for (const previous of before) {
    const current = after?.items.find((item) => item.id === previous.id)
    const message = current ? describeCartChange(previous, current) : null
    if (message) notify.info(message, { id: `nft:${event.data.nftId}` })
  }
  return true
}

function applyNftUpdate(queryClient: QueryClient, event: NftUpdatedEvent): void {
  const { nftId } = event.data
  const detailKey = queryKeys.nfts.detail(nftId)
  const previous = queryClient.getQueryData<NftDetail>(detailKey)

  // Detail: everything the screen shows about price and stock is in the event.
  queryClient.setQueryData<NftDetail>(detailKey, (nft) =>
    nft && nft.version < event.version
      ? { ...patchSummary(nft, event), editions: event.data.editions, updatedAt: event.occurredAt }
      : nft,
  )

  // Catalog pages and carousels: patch the card in place...
  queryClient.setQueriesData<NftListResponse>({ queryKey: queryKeys.nfts.lists() }, (page) =>
    page?.items.some((item) => item.id === nftId && item.version < event.version)
      ? { ...page, items: page.items.map((item) => patchSummary(item, event)) }
      : page,
  )
  // ...and refetch the visible ones: a new price can change order, filters and facets.
  void queryClient.invalidateQueries({ queryKey: queryKeys.nfts.lists() })

  queryClient.setQueryData<FavoritesResponse>(
    queryKeys.private.favorites(currentScope()),
    (favorites) =>
      favorites?.items.some((item) => item.id === nftId && item.version < event.version)
        ? { items: favorites.items.map((item) => patchSummary(item, event)) }
        : favorites,
  )

  void syncCart(queryClient, event).then((inCart) => {
    // Someone looking at this NFT is told why the numbers on screen changed.
    if (inCart || !previous || previous.version >= event.version) return
    if (!isObserved(queryClient, detailKey)) return
    const priceChanged = event.data.editions.some(
      (edition) => previous.editions.find((old) => old.id === edition.id)?.price !== edition.price,
    )
    if (previous.available > 0 && event.data.available === 0) {
      notify.info(`${event.data.name} esgotou.`, { id: `nft:${nftId}` })
    } else if (priceChanged) {
      notify.info(`O preço de ${event.data.name} foi atualizado.`, { id: `nft:${nftId}` })
    } else if (previous.available === 0 && event.data.available > 0) {
      notify.info(`${event.data.name} está disponível novamente.`, { id: `nft:${nftId}` })
    }
  })
}

/* -------------------------------------------------------------------------- */
/* order.updated                                                              */
/* -------------------------------------------------------------------------- */

function applyOrderUpdate(queryClient: QueryClient, event: OrderUpdatedEvent): void {
  const scope = currentScope()
  const { orderId, status } = event.data

  // The receipt is a frozen snapshot already in cache; the event carries the only
  // fields that change when an order settles.
  queryClient.setQueryData<Order>(queryKeys.private.order(scope, orderId), (order) =>
    order && order.version < event.version
      ? {
          ...order,
          status,
          declineReason: event.data.declineReason,
          statusMessage: event.data.statusMessage,
          transaction: event.data.transaction,
          settledAt: event.data.settledAt,
          updatedAt: event.data.updatedAt,
          version: event.version,
        }
      : order,
  )
  // Order lists (and the order itself, in the background) are confirmed by REST.
  void queryClient.invalidateQueries({ queryKey: queryKeys.private.orders(scope) })

  if (status === 'pending') return

  // Confirmed: the API removed the purchased items from the cart.
  // Declined: the reserved stock went back to the catalog.
  void refreshCart(queryClient, scope)
  void queryClient.invalidateQueries({ queryKey: queryKeys.nfts.all })

  if (status === 'confirmed') {
    notify.success('Pagamento confirmado. Seus NFTs estão na sua carteira.', {
      id: `order:${orderId}`,
    })
  } else {
    notify.error(event.data.statusMessage ?? 'Pagamento recusado.', { id: `order:${orderId}` })
  }
}

/* -------------------------------------------------------------------------- */
/* wallet.updated                                                             */
/* -------------------------------------------------------------------------- */

function applyWalletUpdate(queryClient: QueryClient, event: WalletUpdatedEvent): void {
  const key = queryKeys.private.connection(currentScope())
  const current = queryClient.getQueryData<ActiveConnectionResponse>(key)?.connection
  if (!current || current.id !== event.data.connectionId || current.version >= event.version) {
    return
  }

  queryClient.setQueryData<ActiveConnectionResponse>(key, {
    connection: { ...current, status: event.data.status, version: event.version },
  })
  if (current.status === 'connected' && event.data.status === 'disconnected') {
    notify.warning('Sua carteira foi desconectada.', {
      id: 'wallet-connection',
      description: 'Conecte novamente para concluir a compra.',
    })
  }
}

/* -------------------------------------------------------------------------- */
/* Reconnection                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Events emitted while the socket was down are gone, so after a reconnection
 * everything on screen is revalidated through REST: the public catalog and the
 * private resources of the current identity (cart, quote, orders, wallet
 * connection). Inactive entries are only marked stale and refetch when used.
 */
function reconcile(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.nfts.all })
  void queryClient.invalidateQueries({ queryKey: queryKeys.private.scope(currentScope()) })
}

/**
 * Opens the realtime connection and binds it to the query cache.
 * Returns the teardown: listeners are removed and the socket is closed.
 */
export function startRealtimeSync(queryClient: QueryClient): () => void {
  const unsubscribe = [
    realtime.on(NFT_UPDATED, (event) => applyNftUpdate(queryClient, event)),
    realtime.on(ORDER_UPDATED, (event) => applyOrderUpdate(queryClient, event)),
    realtime.on(WALLET_UPDATED, (event) => applyWalletUpdate(queryClient, event)),
    realtime.onReconnect(() => reconcile(queryClient)),
  ]
  realtime.start()

  return () => {
    unsubscribe.forEach((off) => off())
    realtime.stop()
  }
}
