import { AlertIcon, HeartIcon } from '@/components/icons'
import { SiteLink } from '@/components/layout/site-link'
import { Button } from '@/components/ui/button'
import type { NftSummary } from '@/contracts'
import { NftGrid } from '@/features/catalog/components/nft-grid'
import { NftGridSkeleton } from '@/features/catalog/components/nft-grid-skeleton'
import { useFavorites } from '@/features/catalog/queries'
import { useCatalogActions } from '@/features/catalog/use-catalog-actions'
import { errorMessage } from '@/lib/http'

import { AccountShell } from './account-shell'

const nftHref = (nft: NftSummary) => `/nft/${nft.id}`

/** "Lista de interesse": the NFTs the signed-in collector marked as favorites. */
export function FavoritesPage() {
  const { query } = useFavorites()
  const actions = useCatalogActions()
  const items = query.data?.items

  return (
    <AccountShell section="favoritos" title="Lista de interesse">
      <h1 className="text-17 leading-6 font-bold">Lista de interesse</h1>
      <p className="mt-1.5 text-sm text-sand" aria-live="polite">
        {items
          ? items.length === 0
            ? 'Nenhum NFT salvo.'
            : `${items.length} ${items.length === 1 ? 'NFT salvo' : 'NFTs salvos'}.`
          : 'Carregando seus favoritos…'}
      </p>
      <div className="mt-6">
        {items ? (
          items.length === 0 ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 rounded-lg bg-surface p-6 text-center">
              <HeartIcon size={32} className="text-copper" />
              <p className="max-w-md text-sand">
                Toque no coração de um NFT para guardá-lo aqui e acompanhar preço e disponibilidade.
              </p>
              <Button asChild>
                <SiteLink to="/#mercado">Explorar NFTs</SiteLink>
              </Button>
            </div>
          ) : (
            <NftGrid
              items={items}
              getHref={nftHref}
              isFavorite={actions.isFavorite}
              favoritePending={actions.favoritePending}
              addPending={actions.addPending}
              onToggleFavorite={actions.toggleFavorite}
              onAddToCart={(nft) => void actions.addToCart(nft)}
            />
          )
        ) : query.isError ? (
          <div
            role="alert"
            className="flex min-h-[280px] flex-col items-center justify-center gap-4 rounded-lg border border-coral p-6 text-center"
          >
            <AlertIcon size={32} className="text-coral" />
            <h2 className="text-xl font-bold">Não foi possível carregar seus favoritos</h2>
            <p className="max-w-md text-sand">{errorMessage(query.error)}</p>
            <Button onClick={() => void query.refetch()} loading={query.isFetching}>
              Tentar novamente
            </Button>
          </div>
        ) : (
          <NftGridSkeleton count={3} />
        )}
      </div>
    </AccountShell>
  )
}
