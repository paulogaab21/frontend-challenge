import {
  type FavoritesResponse,
  type HighlightsResponse,
  type NftDetail,
  type NftListParams,
  type NftListResponse,
} from '@/contracts'
import { request } from '@/lib/http'

export function fetchNfts(params: NftListParams, signal?: AbortSignal): Promise<NftListResponse> {
  return request<NftListResponse>({ url: '/nfts', method: 'GET', params, signal })
}

export function fetchNft(nftId: string, signal?: AbortSignal): Promise<NftDetail> {
  return request<NftDetail>({ url: `/nfts/${encodeURIComponent(nftId)}`, method: 'GET', signal })
}

export function fetchHighlights(signal?: AbortSignal): Promise<HighlightsResponse> {
  return request<HighlightsResponse>({ url: '/highlights', method: 'GET', signal })
}

export function fetchFavorites(signal?: AbortSignal): Promise<FavoritesResponse> {
  return request<FavoritesResponse>({ url: '/favorites', method: 'GET', signal })
}

export function addFavorite(nftId: string): Promise<FavoritesResponse> {
  return request<FavoritesResponse>({
    url: `/favorites/${encodeURIComponent(nftId)}`,
    method: 'PUT',
  })
}

export function removeFavorite(nftId: string): Promise<FavoritesResponse> {
  return request<FavoritesResponse>({
    url: `/favorites/${encodeURIComponent(nftId)}`,
    method: 'DELETE',
  })
}
