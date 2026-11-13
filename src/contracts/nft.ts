import { z } from 'zod'

import {
  artworkIdSchema,
  categoryIdSchema,
  ethAmountSchema,
  isoDateSchema,
  networkIdSchema,
  paginatedSchema,
  versionSchema,
} from './common'

/* -------------------------------------------------------------------------- */
/* Resources                                                                  */
/* -------------------------------------------------------------------------- */

export const editionIdSchema = z.enum(['unique', 'ten', 'fifty', 'open'])
export type EditionId = z.infer<typeof editionIdSchema>

/** One purchasable edition of an NFT. Price and availability are per edition. */
export const editionSchema = z.object({
  id: editionIdSchema,
  /** Label drawn on the chip: "1/1", "1/10", "1/50", "ABERTA". */
  label: z.string(),
  price: ethAmountSchema,
  /** Total minted supply; null for open editions. */
  supply: z.number().int().positive().nullable(),
  /** Units that can still be bought. 0 = sold out. */
  available: z.number().int().nonnegative(),
  /** Per-order cap enforced by the API. */
  maxPerOrder: z.number().int().positive(),
})
export type Edition = z.infer<typeof editionSchema>

export const nftBadgeSchema = z.enum(['raro', 'novo', 'em-alta'])
export type NftBadge = z.infer<typeof nftBadgeSchema>

/** Card-level projection used by lists, carousels and favorites. */
export const nftSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  tokenId: z.string(),
  artwork: artworkIdSchema,
  collectionId: z.string(),
  collectionName: z.string(),
  category: categoryIdSchema,
  network: networkIdSchema,
  /** Price of the default edition — the "from" price shown on cards. */
  price: ethAmountSchema,
  /** Previous price when the item is discounted (rendered struck through). */
  compareAtPrice: ethAmountSchema.nullable(),
  /** Sum of available units across editions. 0 = sold out. */
  available: z.number().int().nonnegative(),
  defaultEditionId: editionIdSchema,
  badges: z.array(nftBadgeSchema),
  listedAt: isoDateSchema,
  version: versionSchema,
})
export type NftSummary = z.infer<typeof nftSummarySchema>

/**
 * One view of the artwork in the detail gallery. Every view is a framing of the
 * same piece: the full artwork or a close-up of one of its regions.
 */
export const galleryViewSchema = z.object({
  id: z.string(),
  artwork: artworkIdSchema,
  /** Accessible description of the view ("Detalhe do rosto"). */
  label: z.string(),
  /** Zoom factor applied to the artwork (1 = whole piece). */
  zoom: z.number().min(1).max(4),
  /** Focal point in percent of the artwork's width/height. */
  focus: z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) }),
})
export type GalleryView = z.infer<typeof galleryViewSchema>

export const nftReviewSchema = z.object({
  id: z.string(),
  author: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string(),
  createdAt: isoDateSchema,
})
export type NftReview = z.infer<typeof nftReviewSchema>

export const nftDetailSchema = nftSummarySchema.extend({
  description: z.string(),
  /** Long-form paragraphs of the "Detalhes do NFT" tab. */
  details: z.array(z.string()),
  attributes: z.array(z.string()),
  /** Views of the piece shown as thumbnails (the first one is the cover). */
  gallery: z.array(galleryViewSchema).min(1),
  editions: z.array(editionSchema).min(1),
  rating: z.object({
    average: z.number().min(0).max(5),
    count: z.number().int().nonnegative(),
  }),
  /** Most recent collector reviews (the rating covers all of them). */
  reviews: z.array(nftReviewSchema),
  creator: z.object({
    name: z.string(),
    royaltyPercent: z.number().min(0).max(100),
  }),
  contract: z.object({
    address: z.string(),
    standard: z.string(),
  }),
  provenance: z.string(),
  updatedAt: isoDateSchema,
})
export type NftDetail = z.infer<typeof nftDetailSchema>

/* -------------------------------------------------------------------------- */
/* GET /nfts                                                                  */
/* -------------------------------------------------------------------------- */

export const nftSortSchema = z.enum([
  'recentes',
  'preco-asc',
  'preco-desc',
  'nome-asc',
  'nome-desc',
])
export type NftSort = z.infer<typeof nftSortSchema>

export const nftTabSchema = z.enum(['todos', 'novos', 'em-alta'])
export type NftTab = z.infer<typeof nftTabSchema>

export const DEFAULT_PAGE_SIZE = 9

/** Query parameters accepted by GET /nfts. Arrays are sent as repeated keys. */
export const nftListParamsSchema = z.object({
  q: z.string().trim().max(80).optional(),
  category: z.array(categoryIdSchema).optional(),
  network: z.array(networkIdSchema).optional(),
  priceMin: ethAmountSchema.optional(),
  priceMax: ethAmountSchema.optional(),
  tab: nftTabSchema.optional(),
  sort: nftSortSchema.optional(),
  /** Restricts to one collection (used by "Mais desta coleção"). */
  collection: z.string().optional(),
  /** Leaves one NFT out (the one being viewed). */
  exclude: z.string().optional(),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().max(48).optional(),
})
export type NftListParams = z.infer<typeof nftListParamsSchema>

export const facetSchema = z.object({
  id: z.string(),
  label: z.string(),
  count: z.number().int().nonnegative(),
})
export type Facet = z.infer<typeof facetSchema>

export const nftFacetsSchema = z.object({
  categories: z.array(facetSchema),
  networks: z.array(facetSchema),
  /** Bounds of the price slider, computed over the whole catalog. */
  price: z.object({ min: ethAmountSchema, max: ethAmountSchema }),
})
export type NftFacets = z.infer<typeof nftFacetsSchema>

export const nftListResponseSchema = paginatedSchema(nftSummarySchema).extend({
  facets: nftFacetsSchema,
})
export type NftListResponse = z.infer<typeof nftListResponseSchema>

/* -------------------------------------------------------------------------- */
/* Favorites                                                                  */
/* -------------------------------------------------------------------------- */

/** GET /favorites */
export const favoritesResponseSchema = z.object({
  items: z.array(nftSummarySchema),
})
export type FavoritesResponse = z.infer<typeof favoritesResponseSchema>
