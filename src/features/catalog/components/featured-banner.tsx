import type { NftSummary } from '@/contracts'
import { Artwork } from '@/components/artwork'
import { SiteLink } from '@/components/layout/site-link'
import { FeaturedBannerShapes } from './featured-banner-shapes'
import { FeaturedBannerSkeleton } from './featured-banner-skeleton'
export interface FeaturedBannerProps {
  nft?: NftSummary
  to: string
}
export function FeaturedBanner({ nft, to }: FeaturedBannerProps) {
  if (!nft) return <FeaturedBannerSkeleton />
  return (
    <SiteLink
      to={to}
      className="relative block h-[470px] w-full max-w-[310px] overflow-hidden bg-linear-to-b from-copper/10 to-copper/3 pt-6 text-center"
    >
      <h2 className="pl-5 text-left text-2xl leading-8 font-bold text-amber">NFT EM DESTAQUE</h2>
      <p className="mt-2.5 text-22 leading-7 font-bold">OFERTA LIMITADA</p>
      <div className="mt-2.5 h-[368px] overflow-hidden rounded-[22px]">
        <Artwork
          id={nft.artwork}
          alt={nft.name}
          sizes="310px"
          className="h-[368px] w-full [&_img]:object-cover"
        />
      </div>
      <FeaturedBannerShapes />
    </SiteLink>
  )
}
