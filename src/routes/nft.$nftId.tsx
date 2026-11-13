import { createFileRoute } from '@tanstack/react-router'

import { NftDetailPage } from '@/features/catalog/nft-detail-page'
import { nftDetailQueryOptions } from '@/features/catalog/queries'

interface NftSearch {
  /**
   * Edition to show; omitted for the NFT's default edition. Which editions exist is
   * a property of each NFT, so the value is checked by the page against the loaded
   * NFT (an unknown one shows a notice and falls back) rather than here.
   */
  edicao?: string
}

export const Route = createFileRoute('/nft/$nftId')({
  validateSearch: (search: Record<string, unknown>): NftSearch => ({
    edicao:
      typeof search.edicao === 'string' && search.edicao.length > 0 && search.edicao.length <= 32
        ? search.edicao
        : undefined,
  }),
  // Warm the cache on intent/match; the page renders its skeleton meanwhile and
  // handles "not found" itself, so a missing NFT is a page state, not a crash.
  loader: ({ context: { queryClient }, params }) => {
    void queryClient.prefetchQuery(nftDetailQueryOptions(params.nftId))
  },
  component: NftRoute,
})

function NftRoute() {
  const { nftId } = Route.useParams()
  const { edicao } = Route.useSearch()
  // Keyed by id: moving between NFTs resets quantity and gallery state.
  return <NftDetailPage key={nftId} nftId={nftId} requestedEdition={edicao} />
}
