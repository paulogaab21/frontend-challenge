import { useId } from 'react'
import type { NftSummary } from '@/contracts'
import { Artwork } from '@/components/artwork'
import { HeartFilledIcon, HeartIcon, ShoppingIcon, ZoomIcon } from '@/components/icons'
import { SiteLink } from '@/components/layout/site-link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatEth } from '@/lib/money'
import { cn } from '@/lib/utils'

export interface NftCardProps {
  nft: NftSummary
  to: string
  isFavorite: boolean
  favoritePending?: boolean
  onToggleFavorite?: (nft: NftSummary) => void
  onAddToCart?: (nft: NftSummary) => void
  addPending?: boolean
  priority?: boolean
  variant?: 'default' | 'compact'
  headingLevel?: 2 | 3 | 4
  className?: string
}
const badgeLabels = { raro: 'RARO', novo: 'NOVO', 'em-alta': 'EM ALTA' } as const

export function NftCard({
  nft,
  to,
  isFavorite,
  favoritePending,
  onToggleFavorite,
  onAddToCart,
  addPending,
  priority,
  variant = 'default',
  headingLevel = 3,
  className,
}: NftCardProps) {
  const reasonId = useId()
  const compact = variant === 'compact'
  const soldOut = nft.available === 0
  const Heading = `h${headingLevel}` as const
  return (
    <article className={cn('group/nft relative min-w-0', className)}>
      <SiteLink to={to} className="block rounded-3xl md:rounded-none">
        <div
          className={cn(
            'relative flex aspect-[175/200] items-center justify-center overflow-hidden rounded-3xl bg-linear-to-br from-surface to-surface-raised md:aspect-auto md:h-[300px] md:rounded-none md:bg-surface md:bg-none',
            compact &&
              'aspect-auto h-[255px] items-start rounded-none bg-surface bg-none pt-5 md:h-[255px]',
          )}
        >
          <Artwork
            id={nft.artwork}
            alt={nft.name}
            priority={priority}
            sizes={
              compact
                ? '212px'
                : '(min-width: 1280px) 250px, (min-width: 768px) 250px, calc((100vw - 72px) / 2)'
            }
            className={cn(
              'w-[calc(100%-8px)] -translate-y-1 rounded-2xl md:max-w-[250px] md:translate-y-0',
              compact && 'max-w-[212px]',
              soldOut && 'opacity-40',
            )}
          />
          <div className="absolute top-4 left-0 flex flex-wrap gap-1">
            {soldOut ? (
              <Badge variant="rare" className="px-2 text-xs md:text-sm">
                Esgotado
              </Badge>
            ) : (
              nft.badges.map((badge) => (
                <Badge key={badge} variant="rare" className="px-2 text-xs md:px-[15px] md:text-sm">
                  {badgeLabels[badge]}
                </Badge>
              ))
            )}
          </div>
        </div>
        <Heading
          title={nft.name}
          className={cn(
            'mt-2 truncate px-2 text-15 leading-5 font-normal text-cream md:mt-2.5 md:px-0 md:text-base',
            compact && 'mt-[13px] px-0 leading-[18px] md:mt-[13px] md:text-15',
          )}
        >
          {nft.name}
        </Heading>
        <div
          className={cn(
            'flex items-baseline gap-x-2 px-2 text-base leading-6 font-bold text-amber md:gap-x-3 md:px-0 md:text-lg',
            compact && 'px-0 leading-5 md:text-base',
          )}
        >
          {nft.compareAtPrice && <span className="sr-only">por </span>}
          {formatEth(nft.price)}
          {nft.compareAtPrice && (
            <span className="text-xs leading-none font-normal text-khaki md:text-lg">
              <span className="sr-only">de </span>
              <del>{formatEth(nft.compareAtPrice)}</del>
            </span>
          )}
        </div>
      </SiteLink>
      <div
        className={cn(
          'absolute top-3 right-2 md:top-[252px] md:right-auto md:left-1/2 md:flex md:-translate-x-1/2 md:gap-[10px] md:opacity-0 md:transition-opacity md:group-focus-within/nft:opacity-100 md:group-hover/nft:opacity-100',
          compact && 'md:top-[207px]',
        )}
      >
        {onAddToCart && (
          <Button
            variant="icon"
            size="icon"
            className="hidden md:flex"
            disabled={soldOut}
            loading={addPending}
            onClick={() => onAddToCart(nft)}
            aria-label={`Adicionar ${nft.name} ao carrinho`}
            aria-describedby={soldOut ? reasonId : undefined}
          >
            <ShoppingIcon size={20} />
          </Button>
        )}
        {onToggleFavorite && (
          <Button
            variant="icon"
            size="icon"
            className="size-7 rounded-full text-copper md:size-[35px] md:rounded-sm md:text-cream"
            loading={favoritePending}
            onClick={() => onToggleFavorite(nft)}
            aria-pressed={isFavorite}
            aria-label={`${isFavorite ? 'Remover dos favoritos' : 'Favoritar'}: ${nft.name}`}
          >
            {isFavorite ? (
              <HeartFilledIcon size={16} className="md:size-5" />
            ) : (
              <HeartIcon size={16} className="md:size-5" />
            )}
          </Button>
        )}
        <Button variant="icon" size="icon" className="hidden md:flex" asChild>
          <SiteLink to={to} aria-label={`Ver detalhes de ${nft.name}`}>
            <ZoomIcon size={20} />
          </SiteLink>
        </Button>
      </div>
      {soldOut && (
        <p id={reasonId} className="sr-only">
          Este NFT está esgotado e não pode ser adicionado ao carrinho.
        </p>
      )}
    </article>
  )
}
