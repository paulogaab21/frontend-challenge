import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useMemo } from 'react'

import {
  DEFAULT_PAGE_SIZE,
  type FavoritesResponse,
  type NftListParams,
  type NftSummary,
} from '@/contracts'
import { useSession } from '@/features/auth/session'
import { queryKeys } from '@/lib/query-keys'
import { realtime } from '@/lib/realtime/client'

import * as api from './api'

/**
 * Normalizes list parameters so equal filters always map to the same cache entry
 * (and to the same request): defaults are dropped, arrays are sorted.
 */
export function normalizeListParams(params: NftListParams): NftListParams {
  const normalized: NftListParams = {}
  const q = params.q?.trim()
  if (q) normalized.q = q
  if (params.category?.length) normalized.category = [...params.category].sort()
  if (params.network?.length) normalized.network = [...params.network].sort()
  if (params.priceMin) normalized.priceMin = params.priceMin
  if (params.priceMax) normalized.priceMax = params.priceMax
  if (params.tab && params.tab !== 'todos') normalized.tab = params.tab
  if (params.sort && params.sort !== 'recentes') normalized.sort = params.sort
  if (params.collection) normalized.collection = params.collection
  if (params.exclude) normalized.exclude = params.exclude
  if (params.page && params.page > 1) normalized.page = params.page
  if (params.pageSize && params.pageSize !== DEFAULT_PAGE_SIZE)
    normalized.pageSize = params.pageSize
  return normalized
}

/**
 * Catalog page. The key is the parameter set itself, so a response can only ever
 * land in the entry of the request that produced it: answers arriving out of
 * order never overwrite what the collector is looking at. The `signal` aborts the
 * request when its parameters are abandoned.
 */
export function nftListQueryOptions(params: NftListParams) {
  const normalized = normalizeListParams(params)
  return queryOptions({
    queryKey: queryKeys.nfts.list(normalized),
    queryFn: async ({ signal }) => {
      const page = await api.fetchNfts(normalized, signal)
      for (const nft of page.items) realtime.observe('nft', nft.id, nft.version)
      return page
    },
  })
}

/** List query for screens that change parameters in place (filters, pagination). */
export function useNftList(params: NftListParams) {
  return useQuery({ ...nftListQueryOptions(params), placeholderData: keepPreviousData })
}

export function nftDetailQueryOptions(nftId: string) {
  return queryOptions({
    queryKey: queryKeys.nfts.detail(nftId),
    queryFn: async ({ signal }) => {
      const nft = await api.fetchNft(nftId, signal)
      realtime.observe('nft', nft.id, nft.version)
      return nft
    },
  })
}

/* -------------------------------------------------------------------------- */
/* Favorites                                                                  */
/* -------------------------------------------------------------------------- */

export function favoritesQueryOptions(scope: string) {
  return queryOptions({
    queryKey: queryKeys.private.favorites(scope),
    queryFn: ({ signal }) => api.fetchFavorites(signal),
  })
}

export function useFavorites() {
  const { isAuthenticated, scope } = useSession()
  const query = useQuery({ ...favoritesQueryOptions(scope), enabled: isAuthenticated })
  const ids = useMemo(
    () => new Set(isAuthenticated ? (query.data?.items.map((item) => item.id) ?? []) : []),
    [isAuthenticated, query.data],
  )
  return { ...query, ids }
}

interface ToggleFavoriteInput {
  nft: NftSummary
  /** Desired state after the mutation. */
  favorite: boolean
}

/**
 * Optimistic toggle: the heart flips immediately, the request follows. If the API
 * rejects it, the cached list is restored to the snapshot taken before the change.
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient()
  const { scope } = useSession()
  const key = queryKeys.private.favorites(scope)

  return useMutation({
    mutationFn: ({ nft, favorite }: ToggleFavoriteInput) =>
      favorite ? api.addFavorite(nft.id) : api.removeFavorite(nft.id),

    onMutate: async ({ nft, favorite }) => {
      // A refetch in flight would overwrite the optimistic value when it lands.
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<FavoritesResponse>(key)
      queryClient.setQueryData<FavoritesResponse>(key, (current) => {
        const items = current?.items ?? []
        return {
          items: favorite
            ? [nft, ...items.filter((item) => item.id !== nft.id)]
            : items.filter((item) => item.id !== nft.id),
        }
      })
      return { previous }
    },

    onError: (_error, _input, context) => {
      queryClient.setQueryData(key, context?.previous)
    },

    onSuccess: (response) => {
      queryClient.setQueryData(key, response)
    },

    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}
