import {
  DEFAULT_PAGE_SIZE,
  NFT_UPDATED,
  type CategoryId,
  type Edition,
  type EditionId,
  type Facet,
  type NetworkId,
  type NftDetail,
  type NftListParams,
  type NftListResponse,
  type NftSummary,
} from '@/contracts'
import { compareEth, type EthAmount } from '@/lib/money'

import { mockConfig } from '../config'
import { db, type NftRecord } from '../db'
import { CATEGORY_LABELS, NETWORK_LABELS } from '../fixtures/nfts'
import { eventBus } from '../realtime/bus'
import { problems } from './problem'
import { nextEvent } from './events'

export function defaultEdition(nft: NftRecord): Edition {
  const edition = nft.editions.find((item) => item.id === nft.defaultEditionId) ?? nft.editions[0]
  if (!edition) throw new Error(`NFT ${nft.id} has no editions`)
  return edition
}

export function totalAvailable(nft: NftRecord): number {
  return nft.editions.reduce((sum, edition) => sum + edition.available, 0)
}

export function toSummary(nft: NftRecord): NftSummary {
  return {
    id: nft.id,
    name: nft.name,
    tokenId: nft.tokenId,
    artwork: nft.artwork,
    collectionId: nft.collectionId,
    collectionName: nft.collectionName,
    category: nft.category,
    network: nft.network,
    price: defaultEdition(nft).price,
    compareAtPrice: nft.compareAtPrice,
    available: totalAvailable(nft),
    defaultEditionId: nft.defaultEditionId,
    badges: nft.badges,
    listedAt: nft.listedAt,
    version: nft.version,
  }
}

export function toDetail(nft: NftRecord): NftDetail {
  return {
    ...toSummary(nft),
    description: nft.description,
    details: nft.details,
    attributes: nft.attributes,
    gallery: nft.gallery,
    editions: nft.editions,
    rating: nft.rating,
    reviews: nft.reviews,
    creator: nft.creator,
    contract: nft.contract,
    provenance: nft.provenance,
    updatedAt: nft.updatedAt,
  }
}

export function findNft(id: string): NftRecord {
  const nft = db.state.nfts[id]
  if (!nft) throw problems.notFound('Este NFT não existe ou foi removido do mercado.')
  return nft
}

function allNfts(): NftRecord[] {
  if (mockConfig.get().catalog === 'empty') return []
  return db.state.nftOrder.flatMap((id) => db.state.nfts[id] ?? [])
}

function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

function matchesSearch(nft: NftRecord, query: string): boolean {
  const haystack = normalize(
    [
      nft.name,
      nft.collectionName,
      nft.tokenId,
      CATEGORY_LABELS[nft.category],
      ...nft.attributes,
    ].join(' '),
  )
  return normalize(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term))
}

function priceOf(nft: NftRecord): EthAmount {
  return defaultEdition(nft).price
}

/**
 * Filters compose with AND between groups and OR inside a group (two categories →
 * items from either). Facet counts follow the usual faceted-search rule: each group
 * is counted against the results of every *other* active filter.
 */
export function listNfts(params: NftListParams): NftListResponse {
  const base = allNfts()

  const bySearch = (nft: NftRecord) => !params.q || matchesSearch(nft, params.q)
  const byTab = (nft: NftRecord) =>
    !params.tab ||
    params.tab === 'todos' ||
    (params.tab === 'novos' ? nft.badges.includes('novo') : nft.badges.includes('em-alta'))
  const byCollection = (nft: NftRecord) =>
    !params.collection || nft.collectionId === params.collection
  const byExclude = (nft: NftRecord) => !params.exclude || nft.id !== params.exclude
  const byCategory = (nft: NftRecord) =>
    !params.category?.length || params.category.includes(nft.category)
  const byNetwork = (nft: NftRecord) =>
    !params.network?.length || params.network.includes(nft.network)
  const byPrice = (nft: NftRecord) =>
    (!params.priceMin || compareEth(priceOf(nft), params.priceMin) >= 0) &&
    (!params.priceMax || compareEth(priceOf(nft), params.priceMax) <= 0)

  const common = base.filter(
    (nft) => bySearch(nft) && byTab(nft) && byCollection(nft) && byExclude(nft),
  )
  const filtered = common.filter((nft) => byCategory(nft) && byNetwork(nft) && byPrice(nft))

  const sorted = [...filtered]
  switch (params.sort ?? 'recentes') {
    case 'preco-asc':
      sorted.sort((a, b) => compareEth(priceOf(a), priceOf(b)) || a.name.localeCompare(b.name))
      break
    case 'preco-desc':
      sorted.sort((a, b) => compareEth(priceOf(b), priceOf(a)) || a.name.localeCompare(b.name))
      break
    case 'nome-asc':
      sorted.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
      break
    case 'nome-desc':
      sorted.sort((a, b) => b.name.localeCompare(a.name, 'pt-BR'))
      break
    case 'recentes':
      sorted.sort((a, b) => b.listedAt.localeCompare(a.listedAt))
      break
  }

  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE
  const totalItems = sorted.length
  const totalPages = Math.ceil(totalItems / pageSize)
  // A page past the end is answered with the last page that exists, never an error:
  // the client keeps a valid list when filters shrink the result under its feet.
  const page = Math.min(Math.max(params.page ?? 1, 1), Math.max(totalPages, 1))
  const items = sorted.slice((page - 1) * pageSize, page * pageSize).map(toSummary)

  const categoryPool = common.filter((nft) => byNetwork(nft) && byPrice(nft))
  const networkPool = common.filter((nft) => byCategory(nft) && byPrice(nft))

  const categories: Facet[] = (Object.keys(CATEGORY_LABELS) as CategoryId[]).map((id) => ({
    id,
    label: CATEGORY_LABELS[id],
    count: categoryPool.filter((nft) => nft.category === id).length,
  }))
  const networks: Facet[] = (Object.keys(NETWORK_LABELS) as NetworkId[]).map((id) => ({
    id,
    label: NETWORK_LABELS[id],
    count: networkPool.filter((nft) => nft.network === id).length,
  }))

  // Slider bounds cover the whole catalog so they do not jump while filtering.
  const prices = Object.values(db.state.nfts).map(priceOf)
  const min = prices.reduce(
    (low, price) => (compareEth(price, low) < 0 ? price : low),
    prices[0] ?? '0',
  )
  const max = prices.reduce(
    (high, price) => (compareEth(price, high) > 0 ? price : high),
    prices[0] ?? '0',
  )

  return {
    items,
    page,
    pageSize,
    totalItems,
    totalPages,
    facets: { categories, networks, price: { min, max } },
  }
}

/** NFTs flagged as highlights by the marketplace, most recent first. */
export function listHighlights(): NftSummary[] {
  return allNfts()
    .filter((nft) => nft.featured)
    .sort((a, b) => b.listedAt.localeCompare(a.listedAt))
    .map(toSummary)
}

/**
 * Single entry point for catalog changes. Bumps the version, stamps the update and
 * publishes `nft.updated`, which keeps REST and realtime views of the NFT in step.
 */
export function updateNft(id: string, mutate: (nft: NftRecord) => void): NftRecord {
  const nft = findNft(id)
  const previousPrice = defaultEdition(nft).price
  const previousAvailable = totalAvailable(nft)

  mutate(nft)
  nft.version += 1
  nft.updatedAt = new Date().toISOString()

  eventBus.publish({
    ...nextEvent(`nft:${nft.id}`, nft.version),
    type: NFT_UPDATED,
    resource: { type: 'nft', id: nft.id },
    data: {
      nftId: nft.id,
      name: nft.name,
      price: defaultEdition(nft).price,
      previousPrice,
      compareAtPrice: nft.compareAtPrice,
      available: totalAvailable(nft),
      previousAvailable,
      editions: nft.editions,
    },
  })
  return nft
}

export function findEdition(nft: NftRecord, editionId: EditionId): Edition | undefined {
  return nft.editions.find((edition) => edition.id === editionId)
}

/** Changes the stock of one edition by `delta` (negative reserves, positive releases). */
export function adjustAvailability(nftId: string, editionId: EditionId, delta: number): void {
  updateNft(nftId, (nft) => {
    const edition = findEdition(nft, editionId)
    if (edition) edition.available = Math.max(0, edition.available + delta)
  })
}
