import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

import { AppShell } from '@/app/app-shell'
import { AlertIcon, InfoIcon } from '@/components/icons'
import { SiteLink } from '@/components/layout/site-link'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import type { Edition, EditionId, NftDetail, NftSummary } from '@/contracts'
import { useCart } from '@/features/cart/queries'
import { errorMessage, isApiError } from '@/lib/http'
import { useDocumentTitle } from '@/lib/use-document-title'

import { NftCarousel } from './components/nft-carousel'
import { NftCarouselSkeleton } from './components/nft-carousel-skeleton'
import { NftDetailSkeleton } from './components/nft-detail-skeleton'
import { NftDetailTabs } from './components/nft-detail-tabs'
import { NftGallery } from './components/nft-gallery'
import { NftNotFound } from './components/nft-not-found'
import { NftPurchasePanel } from './components/nft-purchase-panel'
import { nftDetailQueryOptions, nftListQueryOptions } from './queries'
import { useCatalogActions } from './use-catalog-actions'

const nftHref = (nft: NftSummary) => `/nft/${nft.id}`

export interface NftDetailPageProps {
  nftId: string
  /** Edition requested through the URL (`?edicao=`), if any. */
  requestedEdition?: EditionId
}

/**
 * Which edition the page shows:
 * 1. the one in the URL, when the NFT has it (even sold out — the page says so);
 * 2. otherwise the default edition, or the first one that can still be bought.
 */
function resolveEdition(nft: NftDetail, requested: EditionId | undefined): Edition {
  const fromUrl = requested && nft.editions.find((edition) => edition.id === requested)
  if (fromUrl) return fromUrl
  const fallback = nft.editions.find((edition) => edition.id === nft.defaultEditionId)
  const purchasable = nft.editions.find((edition) => edition.available > 0)
  const chosen = fallback && fallback.available > 0 ? fallback : (purchasable ?? fallback)
  // The contract guarantees at least one edition.
  return chosen ?? (nft.editions[0] as Edition)
}

function Notice({ tone = 'info', children }: { tone?: 'info' | 'warning'; children: string }) {
  return (
    <Alert role="status" className="border-line-strong">
      {tone === 'warning' ? <AlertIcon className="text-amber" /> : <InfoIcon />}
      <AlertDescription className="text-cream">{children}</AlertDescription>
    </Alert>
  )
}

function Loaded({ nft, requestedEdition }: { nft: NftDetail; requestedEdition?: EditionId }) {
  useDocumentTitle(nft.name)
  const navigate = useNavigate()
  const actions = useCatalogActions()
  const cart = useCart().data
  const [quantityByEdition, setQuantityByEdition] = useState<Partial<Record<EditionId, number>>>({})
  const [buying, setBuying] = useState(false)

  const edition = resolveEdition(nft, requestedEdition)
  const unknownEdition =
    requestedEdition !== undefined && !nft.editions.some((item) => item.id === requestedEdition)

  // What can still be added: the API caps a cart line at min(available, maxPerOrder).
  const inCart = cart?.items.find((item) => item.id === `${nft.id}:${edition.id}`)?.quantity ?? 0
  const limit = Math.min(edition.available, edition.maxPerOrder)
  const remaining = Math.max(0, limit - inCart)
  // Derived, so a real-time drop in stock clamps the quantity without an effect.
  const quantity = Math.min(quantityByEdition[edition.id] ?? 1, Math.max(1, remaining))

  const notice = unknownEdition ? (
    <Notice tone="warning">
      {`A edição solicitada não existe para este NFT. Exibindo a edição ${edition.label}.`}
    </Notice>
  ) : edition.available === 0 && nft.available > 0 ? (
    <Notice tone="warning">
      {`A edição ${edition.label} está esgotada. Escolha outra edição disponível.`}
    </Notice>
  ) : edition.available > 0 && remaining === 0 ? (
    <Notice>
      {`Você já tem no carrinho o máximo permitido da edição ${edition.label} (${inCart}).`}
    </Notice>
  ) : inCart > 0 ? (
    <Notice>
      {`Você já tem ${inCart} ${inCart === 1 ? 'unidade' : 'unidades'} desta edição no carrinho.`}
    </Notice>
  ) : undefined

  async function buy() {
    setBuying(true)
    const added = await actions.addToCart(nft, edition.id, quantity)
    setBuying(false)
    if (added) void navigate({ to: '/carrinho' })
  }

  const url = typeof window === 'undefined' ? '' : window.location.href
  const shareText = `${nft.name} na Kurio`

  return (
    <>
      <div className="mb-2 hidden md:block">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <SiteLink to="/">Início</SiteLink>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <SiteLink to="/#mercado">Mercado</SiteLink>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="grid min-w-0 md:grid-cols-2 md:gap-8 xl:grid-cols-[572px_minmax(0,1fr)]">
        <NftGallery
          views={nft.gallery}
          name={nft.name}
          backTo="/"
          isFavorite={actions.isFavorite(nft)}
          onToggleFavorite={() => actions.toggleFavorite(nft)}
          favoritePending={actions.favoritePending(nft)}
          priority
        />
        <NftPurchasePanel
          nft={nft}
          editions={nft.editions}
          selectedEditionId={edition.id}
          onEditionChange={(editionId) =>
            // The edition is URL state: it survives refresh and can be shared.
            void navigate({
              to: '/nft/$nftId',
              params: { nftId: nft.id },
              search: editionId === nft.defaultEditionId ? {} : { edicao: editionId },
              replace: true,
              resetScroll: false,
            })
          }
          quantity={quantity}
          onQuantityChange={(next) =>
            setQuantityByEdition((current) => ({ ...current, [edition.id]: next }))
          }
          maxQuantity={Math.max(1, Math.min(edition.maxPerOrder, remaining))}
          onBuy={() => void buy()}
          buyPending={buying}
          isFavorite={actions.isFavorite(nft)}
          onToggleFavorite={() => actions.toggleFavorite(nft)}
          favoritePending={actions.favoritePending(nft)}
          onAddToCart={() => void actions.addToCart(nft, edition.id, quantity)}
          addPending={actions.addPending(nft) && !buying}
          disabled={edition.available > 0 && remaining === 0}
          notice={notice}
          shareLinks={{
            linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
            email: `mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(url)}`,
            twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`,
          }}
        />
      </div>

      <div className="mt-24 px-6 md:px-0">
        <NftDetailTabs nft={nft} />
      </div>
    </>
  )
}

/** "Mais desta coleção": other NFTs of the same collection, straight from the API. */
function MoreFromCollection({ nft }: { nft: NftDetail }) {
  const related = useQuery(
    nftListQueryOptions({ collection: nft.collectionId, exclude: nft.id, pageSize: 10 }),
  )
  if (related.isPending) return <NftCarouselSkeleton />
  if (!related.data?.items.length) return null
  return <NftCarousel title="Mais desta coleção" items={related.data.items} getHref={nftHref} />
}

export function NftDetailPage({ nftId, requestedEdition }: NftDetailPageProps) {
  const detail = useQuery(nftDetailQueryOptions(nftId))
  const notFound = isApiError(detail.error, 'NOT_FOUND')
  useDocumentTitle(notFound ? 'NFT não encontrado' : detail.data ? detail.data.name : 'NFT')

  return (
    <AppShell
      activeNav="mercado"
      mobileTopBar={false}
      mobileTab={false}
      mainClassName={detail.data ? 'pb-[calc(190px+env(safe-area-inset-bottom))] md:pb-0' : 'pb-10'}
    >
      <div className="md:container-page md:mt-8">
        {detail.data ? (
          <>
            <Loaded nft={detail.data} requestedEdition={requestedEdition} />
            <div className="mt-24 px-6 md:px-0">
              <MoreFromCollection nft={detail.data} />
            </div>
          </>
        ) : notFound ? (
          <div className="px-6 pt-10 md:px-0 md:pt-0">
            <NftNotFound catalogTo="/" />
          </div>
        ) : detail.isError ? (
          <div
            role="alert"
            className="mx-6 mt-10 flex min-h-[364px] flex-col items-center justify-center gap-4 rounded-lg border border-coral p-6 text-center md:mx-0 md:mt-0"
          >
            <AlertIcon size={32} className="text-coral" />
            <h1 className="text-xl font-bold">Não foi possível carregar este NFT</h1>
            <p className="max-w-md text-sand">{errorMessage(detail.error)}</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button onClick={() => void detail.refetch()} loading={detail.isFetching}>
                Tentar novamente
              </Button>
              <Button variant="outline" asChild>
                <SiteLink to="/">Voltar ao mercado</SiteLink>
              </Button>
            </div>
          </div>
        ) : (
          <NftDetailSkeleton className="px-6 pt-10 md:px-0 md:pt-0" />
        )}
      </div>
    </AppShell>
  )
}
