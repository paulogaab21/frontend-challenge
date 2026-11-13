import { type QueryClient } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'

import { parseSearch, stringifySearch } from '@/lib/search-params'
import { routeTree } from '@/routeTree.gen'

export interface RouterContext {
  queryClient: QueryClient
}

export function createAppRouter(queryClient: QueryClient) {
  return createRouter({
    routeTree,
    context: { queryClient },
    // Hovering or focusing a link warms up its route (code + data).
    defaultPreload: 'intent',
    // TanStack Query owns freshness: the router always asks it instead of caching.
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
    // Plain, shareable query strings: scalars as text, arrays as repeated keys.
    parseSearch,
    stringifySearch,
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}
