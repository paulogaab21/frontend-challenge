import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import { AppShell } from '@/app/app-shell'
import { CloseIcon, FilterIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import type { NftSummary } from '@/contracts'
import { errorMessage } from '@/lib/http'
import { useDocumentTitle } from '@/lib/use-document-title'

import { BlogSection } from './components/blog-section'
import { CatalogEmpty } from './components/catalog-empty'
import { CatalogError } from './components/catalog-error'
import { CatalogFilters, type CatalogFilterValue } from './components/catalog-filters'
import { CatalogFiltersSheet } from './components/catalog-filters-sheet'
import { CatalogFiltersSkeleton } from './components/catalog-filters-skeleton'
import { CatalogPagination } from './components/catalog-pagination'
import { CatalogToolbar } from './components/catalog-toolbar'
import { FeaturedBanner } from './components/featured-banner'
import { HeroCarousel } from './components/hero-carousel'
import { NftGrid } from './components/nft-grid'
import { NftGridSkeleton } from './components/nft-grid-skeleton'
import { PromoCards } from './components/promo-cards'
import { HERO_SLIDES } from './content'
import { highlightsQueryOptions, useNftList } from './queries'
import {
  catalogHref,
  hasActiveFilters,
  toListParams,
  validateCatalogSearch,
  type CatalogSearch,
} from './search'
import { useCatalogActions } from './use-catalog-actions'

const SEARCH_DEBOUNCE_MS = 350

const nftHref = (nft: NftSummary) => `/nft/${nft.id}`

export interface HomePageProps {
  /** Validated URL state of the catalog. */
  search: CatalogSearch
}

/**
 * Home: highlights + the catalog. Search, filters, sorting and pagination are read
 * from the URL and written back to it — the component keeps no copy of them.
 */
export function HomePage({ search }: HomePageProps) {
  useDocumentTitle(search.q ? `Busca: ${search.q}` : null)
  const navigate = useNavigate()
  const actions = useCatalogActions()
  const [sheetOpen, setSheetOpen] = useState(false)

  const list = useNftList(toListParams(search))
  const highlights = useQuery(highlightsQueryOptions())
  const page = list.data
  // Data on screen belongs to other parameters (kept while the new page loads).
  const stale = list.isPlaceholderData

  /**
   * Writes catalog state to the URL. Any change other than the page itself goes
   * back to page 1; the scroll position is kept so the grid updates in place.
   */
  function update(patch: Partial<CatalogSearch>, options: { replace?: boolean } = {}) {
    void navigate({
      to: '/',
      search: (previous) => validateCatalogSearch({ ...previous, pagina: undefined, ...patch }),
      replace: options.replace,
      resetScroll: false,
    })
  }

  const clearFilters = () =>
    update({ categoria: undefined, rede: undefined, precoMin: undefined, precoMax: undefined })
  const clearAll = () => void navigate({ to: '/', search: {}, resetScroll: false })

  /* ---- search box (mobile top bar): live, debounced ---- */
  const urlQuery = search.q ?? ''
  const [query, setQuery] = useState(urlQuery)
  const [pushedQuery, setPushedQuery] = useState(urlQuery)
  const [seenUrlQuery, setSeenUrlQuery] = useState(urlQuery)
  if (urlQuery !== seenUrlQuery) {
    setSeenUrlQuery(urlQuery)
    // The URL changed for a reason other than typing here (history, a link, "limpar").
    if (urlQuery !== pushedQuery) {
      setQuery(urlQuery)
      setPushedQuery(urlQuery)
    }
  }

  function commitQuery(value: string, replace: boolean) {
    const next = value.trim()
    if (next === pushedQuery) return
    setPushedQuery(next)
    void navigate({
      to: '/',
      search: (previous) =>
        validateCatalogSearch({ ...previous, pagina: undefined, q: next || undefined }),
      replace,
      resetScroll: false,
    })
  }

  useEffect(() => {
    if (query.trim() === pushedQuery) return
    // Typing refines the same history entry; Enter (below) adds a new one.
    const timer = setTimeout(() => commitQuery(query, true), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only the typed text restarts the timer
  }, [query, pushedQuery])

  /* ---- filters ---- */
  const filterValue: CatalogFilterValue = {
    category: search.categoria ?? [],
    network: search.rede ?? [],
    priceMin: search.precoMin,
    priceMax: search.precoMax,
  }
  const filterProps = {
    value: filterValue,
    onChange: (next: CatalogFilterValue) =>
      update({
        categoria: next.category.length ? next.category : undefined,
        rede: next.network.length ? next.network : undefined,
        precoMin: next.priceMin,
        precoMax: next.priceMax,
      }),
    onClear: clearFilters,
    pending: stale,
  }

  const summary = page
    ? `${page.totalItems} ${page.totalItems === 1 ? 'NFT encontrado' : 'NFTs encontrados'}` +
      (page.totalPages > 1 ? ` — página ${page.page} de ${page.totalPages}` : '')
    : undefined

  const failed = list.isError && (stale || !page)
  const featured = highlights.data?.items[0]

  return (
    <AppShell
      activeNav="inicio"
      divider
      searchTerm={search.q}
      mobileTab="inicio"
      mobileTopBar={{
        variant: 'home',
        query,
        onSearchChange: setQuery,
        onSearchSubmit: (value) => commitQuery(value, false),
        onFilter: () => setSheetOpen(true),
      }}
    >
      <div className="container-page">
        <div className="md:mt-8">
          <HeroCarousel slides={HERO_SLIDES} />
        </div>

        <div
          id="mercado"
          className="mt-3.5 grid min-w-0 scroll-mt-4 gap-6 md:mt-24 lg:grid-cols-[310px_minmax(0,1fr)] lg:gap-12"
        >
          <div className="hidden lg:block">
            {page ? (
              <CatalogFilters facets={page.facets} {...filterProps} />
            ) : (
              <CatalogFiltersSkeleton />
            )}
            {(highlights.isPending || featured) && (
              <div className="mt-6">
                <FeaturedBanner nft={featured} to={featured ? nftHref(featured) : '/'} />
              </div>
            )}
          </div>

          <section aria-label="Mercado de NFTs" className="min-w-0">
            <div className="mb-5 hidden md:block lg:hidden">
              <Button variant="outline" size="sm" onClick={() => setSheetOpen(true)}>
                <FilterIcon />
                Filtros
              </Button>
            </div>

            <CatalogToolbar
              tab={search.aba ?? 'todos'}
              onTabChange={(aba) => update({ aba })}
              sort={search.ordem ?? 'recentes'}
              onSortChange={(ordem) => update({ ordem })}
              resultSummary={failed ? undefined : summary}
            />

            {(search.q || (list.isFetching && page)) && (
              <div className="mt-3 flex min-h-6 flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                {search.q && (
                  <p className="flex min-w-0 items-center gap-2 text-sand">
                    <span className="truncate">
                      Resultados para <strong className="text-cream">“{search.q}”</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => update({ q: undefined })}
                      className="inline-flex shrink-0 items-center gap-1 rounded-sm text-amber underline-offset-4 hover:underline"
                    >
                      <CloseIcon size={10} />
                      Limpar busca
                    </button>
                  </p>
                )}
                {list.isFetching && page && (
                  <p role="status" className="ml-auto text-khaki">
                    Atualizando…
                  </p>
                )}
              </div>
            )}

            {list.isError && page && !stale && (
              <p role="alert" className="mt-3 text-sm text-coral">
                Não foi possível atualizar o catálogo. Os dados exibidos podem estar desatualizados.{' '}
                <button
                  type="button"
                  onClick={() => void list.refetch()}
                  className="rounded-sm text-amber underline underline-offset-4"
                >
                  Tentar novamente
                </button>
              </p>
            )}

            <div className="mt-4 md:mt-[27px]" aria-busy={list.isFetching || undefined}>
              {failed ? (
                <CatalogError
                  message={errorMessage(list.error)}
                  onRetry={() => void list.refetch()}
                  pending={list.isFetching}
                />
              ) : !page ? (
                <NftGridSkeleton />
              ) : page.items.length === 0 ? (
                <CatalogEmpty
                  onClear={clearAll}
                  hint={
                    hasActiveFilters(search)
                      ? undefined
                      : 'Nenhum NFT está listado no momento. Volte em instantes.'
                  }
                />
              ) : (
                <div className={stale ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
                  <NftGrid
                    items={page.items}
                    getHref={nftHref}
                    isFavorite={actions.isFavorite}
                    favoritePending={actions.favoritePending}
                    addPending={actions.addPending}
                    onToggleFavorite={actions.toggleFavorite}
                    onAddToCart={(nft) => void actions.addToCart(nft)}
                    priorityCount={3}
                  />
                </div>
              )}
            </div>

            {page && !failed && page.totalPages > 1 && (
              <div className="mt-20 md:mt-[84px]">
                <CatalogPagination
                  page={page.page}
                  totalPages={page.totalPages}
                  getHref={(target) => `${catalogHref({ ...search, pagina: target })}#mercado`}
                />
              </div>
            )}
          </section>
        </div>

        <div className="mt-24 hidden md:block">
          <PromoCards />
        </div>
        <div className="mt-24 hidden md:block">
          <BlogSection />
        </div>
      </div>

      {page && (
        <CatalogFiltersSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          facets={page.facets}
          {...filterProps}
        />
      )}
    </AppShell>
  )
}
