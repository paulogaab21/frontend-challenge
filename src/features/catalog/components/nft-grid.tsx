import type { NftSummary } from '@/contracts'
import { NftCard, type NftCardProps } from './nft-card'
export interface NftGridProps {
  items: NftSummary[]
  getHref: (nft: NftSummary) => string
  isFavorite?: (nft: NftSummary) => boolean
  favoritePending?: (nft: NftSummary) => boolean
  addPending?: (nft: NftSummary) => boolean
  onToggleFavorite?: NftCardProps['onToggleFavorite']
  onAddToCart?: NftCardProps['onAddToCart']
  priorityCount?: number
  headingLevel?: NftCardProps['headingLevel']
}
export function NftGrid({
  items,
  getHref,
  isFavorite,
  favoritePending,
  addPending,
  onToggleFavorite,
  onAddToCart,
  priorityCount = 0,
  headingLevel = 2,
}: NftGridProps) {
  return (
    <ul className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-4 pb-8 md:gap-x-[34px] md:gap-y-16 md:pb-0 xl:grid-cols-3">
      {items.map((nft, index) => (
        <li key={nft.id} className="min-w-0 even:translate-y-8 md:even:translate-y-0">
          <NftCard
            headingLevel={headingLevel}
            nft={nft}
            to={getHref(nft)}
            isFavorite={isFavorite?.(nft) ?? false}
            favoritePending={favoritePending?.(nft)}
            addPending={addPending?.(nft)}
            onToggleFavorite={onToggleFavorite}
            onAddToCart={onAddToCart}
            priority={index < priorityCount}
          />
        </li>
      ))}
    </ul>
  )
}
