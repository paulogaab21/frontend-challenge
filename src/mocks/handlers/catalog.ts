import { nftListParamsSchema, type FavoritesResponse } from '@/contracts'

import { db } from '../db'
import { findNft, listNfts, toDetail, toSummary } from '../domain/catalog'
import { problems } from '../domain/problem'
import { fieldErrorsOf, route } from './route'

function positiveInt(value: string | null): number | undefined {
  if (value === null || value === '') return undefined
  const parsed = Number(value)
  return Number.isInteger(parsed) ? parsed : Number.NaN
}

function favoritesOf(userId: string): FavoritesResponse {
  const ids = db.state.favorites[userId] ?? []
  return { items: ids.flatMap((id) => (db.state.nfts[id] ? [toSummary(db.state.nfts[id])] : [])) }
}

export const catalogHandlers = [
  /**
   * Catalog listing. Every parameter is optional and combinable:
   * q, category (repeatable), network (repeatable), priceMin, priceMax, tab, sort,
   * collection, exclude, page, pageSize. Public: the Authorization header is ignored.
   */
  route(
    'GET',
    '/nfts',
    ({ url }) => {
      const query = url.searchParams
      const parsed = nftListParamsSchema.safeParse({
        q: query.get('q') ?? undefined,
        category: query.getAll('category').length ? query.getAll('category') : undefined,
        network: query.getAll('network').length ? query.getAll('network') : undefined,
        priceMin: query.get('priceMin') ?? undefined,
        priceMax: query.get('priceMax') ?? undefined,
        tab: query.get('tab') ?? undefined,
        sort: query.get('sort') ?? undefined,
        collection: query.get('collection') ?? undefined,
        exclude: query.get('exclude') ?? undefined,
        page: positiveInt(query.get('page')),
        pageSize: positiveInt(query.get('pageSize')),
      })
      if (!parsed.success) {
        throw problems.validation(fieldErrorsOf(parsed.error), 'Parâmetros de consulta inválidos.')
      }
      return listNfts(parsed.data)
    },
    { auth: 'none' },
  ),

  /** NFT detail. 404 NOT_FOUND for unknown ids. Public. */
  route<{ nftId: string }>('GET', '/nfts/:nftId', ({ params }) => toDetail(findNft(params.nftId)), {
    auth: 'none',
  }),

  route(
    'GET',
    '/favorites',
    ({ auth }) => {
      if (!auth) throw problems.unauthenticated()
      return favoritesOf(auth.user.id)
    },
    { auth: 'required' },
  ),

  /** Idempotent: favoriting twice keeps a single entry. */
  route<{ nftId: string }>(
    'PUT',
    '/favorites/:nftId',
    ({ auth, params }) => {
      if (!auth) throw problems.unauthenticated()
      findNft(params.nftId)
      const list = (db.state.favorites[auth.user.id] ??= [])
      if (!list.includes(params.nftId)) list.unshift(params.nftId)
      return favoritesOf(auth.user.id)
    },
    { auth: 'required' },
  ),

  /** Idempotent: removing something that is not a favorite is a success. */
  route<{ nftId: string }>(
    'DELETE',
    '/favorites/:nftId',
    ({ auth, params }) => {
      if (!auth) throw problems.unauthenticated()
      db.state.favorites[auth.user.id] = (db.state.favorites[auth.user.id] ?? []).filter(
        (id) => id !== params.nftId,
      )
      return favoritesOf(auth.user.id)
    },
    { auth: 'required' },
  ),
]
