import { z } from 'zod'

import {
  categoryIdSchema,
  ethAmountSchema,
  networkIdSchema,
  nftSortSchema,
  nftTabSchema,
  type NftListParams,
} from '@/contracts'
import { stringifySearch, toArray } from '@/lib/search-params'

/**
 * URL state of the catalog (home page):
 *
 *   /?q=golden&categoria=musica&categoria=jogos&rede=ethereum
 *     &precoMin=0.5&precoMax=2&aba=novos&ordem=preco-asc&pagina=2
 *
 * The URL is the single source of truth for search, filters, sorting and
 * pagination — nothing is mirrored in component state — so refresh, sharing a
 * link and the browser's back/forward buttons all restore the same catalog.
 *
 * Anything invalid in the query string is dropped instead of failing the page,
 * and default values are left out, so equal states always produce equal URLs.
 */

/** A repeatable key holding values of one enum: invalid members are discarded. */
function enumList<Schema extends z.ZodType<string>>(member: Schema) {
  return z.preprocess((value) => {
    const valid = toArray(value)?.filter((item) => member.safeParse(item).success)
    return valid?.length ? [...new Set(valid)].sort() : undefined
  }, z.array(member).optional())
}

const rawSchema = z.object({
  q: z.string().trim().min(1).max(80).optional().catch(undefined),
  categoria: enumList(categoryIdSchema),
  rede: enumList(networkIdSchema),
  precoMin: ethAmountSchema.optional().catch(undefined),
  precoMax: ethAmountSchema.optional().catch(undefined),
  aba: nftTabSchema.optional().catch(undefined),
  ordem: nftSortSchema.optional().catch(undefined),
  pagina: z.coerce.number().int().min(1).max(9999).optional().catch(undefined),
})

export type CatalogSearch = z.infer<typeof rawSchema>

export function validateCatalogSearch(search: Record<string, unknown>): CatalogSearch {
  const parsed = rawSchema.parse(search)
  const result: CatalogSearch = {}
  if (parsed.q) result.q = parsed.q
  if (parsed.categoria) result.categoria = parsed.categoria
  if (parsed.rede) result.rede = parsed.rede
  if (parsed.precoMin) result.precoMin = parsed.precoMin
  if (parsed.precoMax) result.precoMax = parsed.precoMax
  if (parsed.aba && parsed.aba !== 'todos') result.aba = parsed.aba
  if (parsed.ordem && parsed.ordem !== 'recentes') result.ordem = parsed.ordem
  if (parsed.pagina && parsed.pagina > 1) result.pagina = parsed.pagina
  return result
}

/** Translates the URL state into the parameters of GET /nfts. */
export function toListParams(search: CatalogSearch): NftListParams {
  return {
    q: search.q,
    category: search.categoria,
    network: search.rede,
    priceMin: search.precoMin,
    priceMax: search.precoMax,
    tab: search.aba,
    sort: search.ordem,
    page: search.pagina,
  }
}

/** True when anything narrows the catalog (used to offer "Limpar filtros"). */
export function hasActiveFilters(search: CatalogSearch): boolean {
  return Boolean(
    search.q ||
    search.categoria?.length ||
    search.rede?.length ||
    search.precoMin ||
    search.precoMax ||
    search.aba,
  )
}

/** Href of the catalog for a given state — used by real anchors (pagination). */
export function catalogHref(search: CatalogSearch): string {
  return `/${stringifySearch(validateCatalogSearch(search))}`
}
