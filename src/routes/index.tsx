import { createFileRoute } from '@tanstack/react-router'

import { HomePage } from '@/features/catalog/home-page'
import { highlightsQueryOptions, nftListQueryOptions } from '@/features/catalog/queries'
import { toListParams, validateCatalogSearch } from '@/features/catalog/search'

export const Route = createFileRoute('/')({
  validateSearch: validateCatalogSearch,
  loaderDeps: ({ search }) => ({ search }),
  // Starts the requests as soon as the route matches (or is hovered), without
  // holding the navigation: the page renders its skeletons meanwhile.
  loader: ({ context: { queryClient }, deps }) => {
    void queryClient.prefetchQuery(nftListQueryOptions(toListParams(deps.search)))
    void queryClient.prefetchQuery(highlightsQueryOptions())
  },
  component: HomeRoute,
})

function HomeRoute() {
  return <HomePage search={Route.useSearch()} />
}
