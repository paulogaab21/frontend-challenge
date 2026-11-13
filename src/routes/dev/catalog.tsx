import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { PageShell } from '@/components/layout/page-shell'
import { Button } from '@/components/ui/button'
import { FilterIcon } from '@/components/icons'
import { HeroCarousel } from '@/features/catalog/components/hero-carousel'
import { HeroCarouselSkeleton } from '@/features/catalog/components/hero-carousel-skeleton'
import {
  CatalogFilters,
  type CatalogFilterValue,
} from '@/features/catalog/components/catalog-filters'
import { CatalogFiltersSkeleton } from '@/features/catalog/components/catalog-filters-skeleton'
import { CatalogFiltersSheet } from '@/features/catalog/components/catalog-filters-sheet'
import { CatalogToolbar } from '@/features/catalog/components/catalog-toolbar'
import { CatalogPagination } from '@/features/catalog/components/catalog-pagination'
import { NftGrid } from '@/features/catalog/components/nft-grid'
import { NftGridSkeleton } from '@/features/catalog/components/nft-grid-skeleton'
import { CatalogEmpty } from '@/features/catalog/components/catalog-empty'
import { CatalogError } from '@/features/catalog/components/catalog-error'
import { FeaturedBanner } from '@/features/catalog/components/featured-banner'
import { PromoCards } from '@/features/catalog/components/promo-cards'
import { BlogSection } from '@/features/catalog/components/blog-section'
import type { NftSort, NftTab } from '@/contracts'
import { sampleSlides, sampleCards, sampleFacets, nftHref } from './_sample'
import { ShowcaseControls } from './-showcase-controls'
export const Route = createFileRoute('/dev/catalog')({ component: CatalogShowcase })
function CatalogShowcase() {
  const [value, setValue] = useState<CatalogFilterValue>({ category: [], network: [] })
  const [tab, setTab] = useState<NftTab>('todos')
  const [sort, setSort] = useState<NftSort>('recentes')
  const [sheet, setSheet] = useState(false)
  const [favorites, setFavorites] = useState<string[]>([])
  const [count, setCount] = useState(6)
  const [state, setState] = useState<
    'ready' | 'loading' | 'empty' | 'error' | 'soldout' | 'pending'
  >('ready')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(4)
  const [autoplay, setAutoplay] = useState(false)
  const [query, setQuery] = useState('')
  const clear = () => setValue({ category: [], network: [] })
  const items =
    state === 'soldout' ? sampleCards.map((nft) => ({ ...nft, available: 0 })) : sampleCards
  return (
    <>
      <PageShell
        header={{ divider: true, activeNav: 'inicio', cartCount: count }}
        mobileTopBar={{
          variant: 'home',
          query,
          onSearchChange: setQuery,
          onFilter: () => setSheet(true),
        }}
        mobileTabBar={{ cartCount: count }}
      >
        <div className="container-page">
          <div className="md:mt-8">
            {state === 'loading' ? (
              <HeroCarouselSkeleton />
            ) : (
              <HeroCarousel slides={sampleSlides} autoplay={autoplay} intervalMs={3000} />
            )}
          </div>
          <div
            id="mercado"
            className="mt-3.5 grid min-w-0 gap-6 md:mt-24 lg:grid-cols-[310px_minmax(0,1fr)] lg:gap-12"
          >
            <div className="hidden lg:block">
              {state === 'loading' ? (
                <CatalogFiltersSkeleton />
              ) : (
                <CatalogFilters
                  facets={sampleFacets}
                  value={value}
                  onChange={setValue}
                  onClear={clear}
                />
              )}
              <div className="mt-6">
                <FeaturedBanner
                  nft={state === 'loading' ? undefined : sampleCards[3]}
                  to="/dev/nft"
                />
              </div>
            </div>
            <section aria-label="Mercado de NFTs" className="min-w-0">
              <div className="mb-5 hidden md:block lg:hidden">
                <Button variant="outline" size="sm" onClick={() => setSheet(true)}>
                  <FilterIcon />
                  Filtros
                </Button>
              </div>
              <CatalogToolbar
                tab={tab}
                onTabChange={setTab}
                sort={sort}
                onSortChange={setSort}
                resultSummary={`${items.length} NFTs encontrados`}
              />
              <div className="mt-4 md:mt-7">
                {state === 'loading' ? (
                  <NftGridSkeleton />
                ) : state === 'empty' ? (
                  <CatalogEmpty
                    onClear={() => {
                      clear()
                      setState('ready')
                    }}
                  />
                ) : state === 'error' ? (
                  <CatalogError
                    message="Não foi possível carregar o catálogo."
                    onRetry={() => setState('ready')}
                  />
                ) : (
                  <NftGrid
                    items={items}
                    getHref={nftHref}
                    isFavorite={(nft) => favorites.includes(nft.id)}
                    onToggleFavorite={(nft) =>
                      setFavorites((prev) =>
                        prev.includes(nft.id)
                          ? prev.filter((id) => id !== nft.id)
                          : [...prev, nft.id],
                      )
                    }
                    onAddToCart={() => setCount((prev) => prev + 1)}
                    favoritePending={() => state === 'pending'}
                    addPending={() => state === 'pending'}
                  />
                )}
              </div>
              <div className="mt-20">
                <CatalogPagination
                  page={page}
                  totalPages={totalPages}
                  getHref={(next) => `/dev/catalog#pagina-${next}`}
                  onNavigate={setPage}
                />
              </div>
            </section>
          </div>
          <div className="mt-24 hidden md:block">
            <PromoCards />
          </div>
          <div className="mt-24 hidden md:block">
            <BlogSection />
          </div>
        </div>
        <CatalogFiltersSheet
          open={sheet}
          onOpenChange={setSheet}
          facets={sampleFacets}
          value={value}
          onChange={setValue}
          onClear={clear}
        />
        <ShowcaseControls>
          <Button
            variant="outline"
            aria-pressed={totalPages > 5}
            onClick={() => {
              setPage(1)
              setTotalPages(totalPages > 5 ? 4 : 12)
            }}
          >
            Paginação longa
          </Button>
          <Button
            variant="outline"
            aria-pressed={autoplay}
            onClick={() => setAutoplay((value) => !value)}
          >
            Alternância automática
          </Button>
          {(['ready', 'loading', 'empty', 'error', 'soldout', 'pending'] as const).map(
            (item, index) => (
              <Button
                key={item}
                variant="outline"
                aria-pressed={state === item}
                onClick={() => setState(item)}
              >
                {['Pronto', 'Carregando', 'Vazio', 'Erro', 'Esgotado', 'Pendente'][index]}
              </Button>
            ),
          )}
        </ShowcaseControls>
      </PageShell>
    </>
  )
}
