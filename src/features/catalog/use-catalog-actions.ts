import { useMutationState } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useCallback, useMemo } from 'react'

import { type EditionId, type NftSummary } from '@/contracts'
import { useSession } from '@/features/auth/session'
import { useAddToCart, usePendingCartAdds } from '@/features/cart/queries'
import { errorMessage } from '@/lib/http'
import { notify } from '@/lib/notify'

import {
  favoriteMutationKey,
  useFavorites,
  useToggleFavorite,
  type ToggleFavoriteInput,
} from './queries'

/**
 * The two actions every NFT card offers — favorite and add to cart — with their
 * feedback, shared by the catalog, the carousels, the detail and the favorites.
 *
 * - Favorites belong to an account: a visitor is taken to the sign-in page and
 *   comes back to where they were.
 * - Both actions report success and failure through the app's live region.
 */
export function useCatalogActions() {
  const router = useRouter()
  const { isAuthenticated, scope } = useSession()
  const { ids: favoriteIds } = useFavorites()
  const toggle = useToggleFavorite()
  const add = useAddToCart()
  const pendingAdds = usePendingCartAdds()

  const pendingFavoriteIds = useMutationState({
    filters: { mutationKey: favoriteMutationKey(scope), status: 'pending' },
    select: (mutation) => (mutation.state.variables as ToggleFavoriteInput | undefined)?.nft.id,
  })
  const pendingFavorites = useMemo(() => new Set(pendingFavoriteIds), [pendingFavoriteIds])

  const { mutateAsync: toggleAsync } = toggle
  const toggleFavorite = useCallback(
    (nft: NftSummary) => {
      if (!isAuthenticated) {
        notify.info('Entre na sua conta para salvar favoritos.', { id: 'auth-required' })
        void router.navigate({ to: '/entrar', search: { redirect: router.state.location.href } })
        return
      }
      const favorite = !favoriteIds.has(nft.id)
      toggleAsync({ nft, favorite }).then(
        () =>
          notify.success(
            favorite
              ? `${nft.name} adicionado aos favoritos.`
              : `${nft.name} removido dos favoritos.`,
            { id: `favorite:${nft.id}` },
          ),
        (error: unknown) =>
          notify.error(
            favorite
              ? `Não foi possível favoritar ${nft.name}.`
              : `Não foi possível remover ${nft.name} dos favoritos.`,
            { id: `favorite:${nft.id}`, description: errorMessage(error) },
          ),
      )
    },
    [favoriteIds, isAuthenticated, router, toggleAsync],
  )

  const { mutateAsync: addAsync } = add
  /** Resolves to true when the item reached the cart. */
  const addToCart = useCallback(
    (nft: NftSummary, editionId: EditionId = nft.defaultEditionId, quantity = 1) =>
      addAsync({ nftId: nft.id, editionId, quantity }).then(
        () => {
          notify.success(`${nft.name} adicionado ao carrinho.`, { id: `cart-add:${nft.id}` })
          return true
        },
        (error: unknown) => {
          notify.error(errorMessage(error, 'Não foi possível adicionar ao carrinho.'), {
            id: `cart-add:${nft.id}`,
          })
          return false
        },
      ),
    [addAsync],
  )

  return {
    isFavorite: useCallback((nft: NftSummary) => favoriteIds.has(nft.id), [favoriteIds]),
    favoritePending: useCallback(
      (nft: NftSummary) => pendingFavorites.has(nft.id),
      [pendingFavorites],
    ),
    addPending: useCallback((nft: NftSummary) => pendingAdds.has(nft.id), [pendingAdds]),
    toggleFavorite,
    addToCart,
  }
}
