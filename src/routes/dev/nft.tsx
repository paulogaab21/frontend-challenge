import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { PageShell } from '@/components/layout/page-shell'
import { SiteLink } from '@/components/layout/site-link'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { InfoIcon } from '@/components/icons'
import { NftGallery } from '@/features/catalog/components/nft-gallery'
import { NftPurchasePanel } from '@/features/catalog/components/nft-purchase-panel'
import { NftDetailTabs } from '@/features/catalog/components/nft-detail-tabs'
import { NftCarousel } from '@/features/catalog/components/nft-carousel'
import { NftCarouselSkeleton } from '@/features/catalog/components/nft-carousel-skeleton'
import { NftDetailSkeleton } from '@/features/catalog/components/nft-detail-skeleton'
import { NftNotFound } from '@/features/catalog/components/nft-not-found'
import type { EditionId } from '@/contracts'
import { sampleNft, sampleCards, nftHref } from './_sample'
import { ShowcaseControls } from './-showcase-controls'
export const Route = createFileRoute('/dev/nft')({ component: NftShowcase })
function NftShowcase() {
  const [edition, setEdition] = useState<EditionId>(sampleNft.defaultEditionId)
  const [quantity, setQuantity] = useState(1)
  const [favorite, setFavorite] = useState(false)
  const [state, setState] = useState<
    'ready' | 'loading' | 'missing' | 'soldout' | 'pending' | 'error' | 'notice'
  >('ready')
  const [action, setAction] = useState('')
  const nft =
    state === 'soldout'
      ? {
          ...sampleNft,
          available: 0,
          editions: sampleNft.editions.map((item) => ({ ...item, available: 0 })),
        }
      : sampleNft
  const selected = nft.editions.find((item) => item.id === edition)
  return (
    <PageShell
      header={{ activeNav: 'mercado', cartCount: 6 }}
      mobileTopBar={false}
      mobileTabBar={false}
      mainClassName="pb-[calc(190px+env(safe-area-inset-bottom))] md:pb-0"
    >
      <div className="md:container-page md:mt-8">
        {state === 'missing' ? (
          <NftNotFound catalogTo="/dev/catalog" />
        ) : state === 'loading' ? (
          <NftDetailSkeleton />
        ) : (
          <>
            <div className="mb-2 hidden md:block">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <SiteLink to="/dev/catalog">Início</SiteLink>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <SiteLink to="/dev/catalog#mercado">Mercado</SiteLink>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            <div className="grid min-w-0 md:grid-cols-2 md:gap-8 xl:grid-cols-[572px_minmax(0,1fr)]">
              <NftGallery
                views={nft.gallery}
                name={nft.name}
                backTo="/dev/catalog"
                isFavorite={favorite}
                onToggleFavorite={() => setFavorite((prev) => !prev)}
                favoritePending={state === 'pending'}
              />
              <NftPurchasePanel
                nft={nft}
                editions={nft.editions}
                selectedEditionId={edition}
                onEditionChange={(id) => {
                  setEdition(id)
                  setQuantity(1)
                }}
                quantity={quantity}
                onQuantityChange={setQuantity}
                maxQuantity={selected?.maxPerOrder ?? 1}
                onBuy={() => setAction('Comprar selecionado — demonstração sem envio.')}
                buyPending={state === 'pending'}
                isFavorite={favorite}
                onToggleFavorite={() => setFavorite((prev) => !prev)}
                favoritePending={state === 'pending'}
                onAddToCart={() =>
                  setAction('Adicionar ao carrinho selecionado — demonstração sem envio.')
                }
                addPending={state === 'pending'}
                shareLinks={{
                  linkedin:
                    'https://www.linkedin.com/sharing/share-offsite/?url=http%3A%2F%2Flocalhost%3A5174%2Fdev%2Fnft',
                  email: 'mailto:?subject=Emerald%20Ape%20%23042',
                  twitter: 'https://twitter.com/intent/tweet?text=Emerald%20Ape%20%23042',
                }}
                mobileDescription="Um colecionável digital 1/50 finalizado à mão da coleção Kurio Editions, verificado na Ethereum."
                error={
                  state === 'error' ? 'Não foi possível continuar. Tente novamente.' : undefined
                }
                notice={
                  state === 'notice' ? (
                    <Alert>
                      <InfoIcon />
                      <AlertDescription>O preço desta edição foi atualizado.</AlertDescription>
                    </Alert>
                  ) : undefined
                }
              />
            </div>
            <div className="mt-24 px-6 md:px-0">
              <NftDetailTabs nft={nft} />
            </div>
          </>
        )}
        <div className="mt-24 px-6 md:px-0">
          {state === 'loading' ? (
            <NftCarouselSkeleton />
          ) : (
            <NftCarousel
              title="Mais desta coleção"
              items={sampleCards.slice(3, 9)}
              getHref={nftHref}
            />
          )}
        </div>
        <div className="mt-24 px-6 md:px-0">
          <NftCarousel title="Colecionadores também viram" items={sampleCards} getHref={nftHref} />
        </div>
      </div>
      <ShowcaseControls>
        {(['ready', 'loading', 'missing', 'soldout', 'pending', 'error', 'notice'] as const).map(
          (item, index) => (
            <Button
              key={item}
              variant="outline"
              aria-pressed={state === item}
              onClick={() => setState(item)}
            >
              {
                ['Pronto', 'Carregando', 'Não encontrado', 'Esgotado', 'Pendente', 'Erro', 'Aviso'][
                  index
                ]
              }
            </Button>
          ),
        )}
        <p role="status" className="basis-full text-sand">
          {action}
        </p>
      </ShowcaseControls>
    </PageShell>
  )
}
