import { useId } from 'react'
import type { NftDetail } from '@/contracts'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { RatingStars } from './rating-stars'
export interface NftDetailTabsProps {
  nft: NftDetail
  defaultTab?: 'details' | 'reviews'
}
const networkNames = { ethereum: 'Ethereum', polygon: 'Polygon', solana: 'Solana' } as const
/**
 * Desktop tab, as measured in the layout: a 20px text line, 7px of air and a 3px
 * marker that sits on top of the rule of the list and runs 8px past the label.
 */
const tabClassName =
  'text-17 md:-mb-px md:min-h-0 md:border-b-[3px] md:pr-2 md:pb-[7px] md:leading-5'
/** "0x7A42...19E8", the shortened form the layout uses for contract addresses. */
const shortAddress = (address: string) =>
  address.length > 12 ? `${address.slice(0, 6)}...${address.slice(-4)}` : address
export function NftDetailTabs({ nft, defaultTab = 'details' }: NftDetailTabsProps) {
  const id = useId()
  return (
    <Tabs defaultValue={defaultTab} className="gap-4 md:gap-3">
      <TabsList
        aria-label="Informações do NFT"
        className="w-full justify-start border-b border-hairline md:gap-x-8"
      >
        <TabsTrigger value="details" className={cn(tabClassName, 'font-bold')}>
          Detalhes do NFT
        </TabsTrigger>
        <TabsTrigger value="reviews" className={cn(tabClassName, 'font-normal')}>
          Avaliações de colecionadores ({nft.rating.count})
        </TabsTrigger>
      </TabsList>
      <TabsContent value="details">
        <div className="space-y-6 text-sm leading-6 text-sand">
          {nft.details.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
        <dl className="mt-6 space-y-5 text-sm leading-6 md:mt-3 md:space-y-3">
          <div>
            <dt className="font-bold">Rede:</dt>
            <dd className="text-sand">
              {nft.provenance ||
                `Cunhado na ${networkNames[nft.network]} com procedência imutável e metadados armazenados no IPFS.`}
            </dd>
          </div>
          <div>
            <dt className="font-bold">Contrato:</dt>
            <dd className="text-sand">
              <span title={nft.contract.address}>{shortAddress(nft.contract.address)}</span> •
              Contrato inteligente {nft.contract.standard} verificado.
            </dd>
          </div>
          <div>
            <dt className="font-bold">Direitos autorais:</dt>
            <dd className="text-sand">
              Direitos autorais do criador: {nft.creator.royaltyPercent.toLocaleString('pt-BR')}%
              nas vendas secundárias, pagos automaticamente pelos mercados compatíveis.
            </dd>
          </div>
        </dl>
      </TabsContent>
      <TabsContent value="reviews">
        <section aria-labelledby={id}>
          <h2 id={id} className="text-lg font-bold">
            Avaliações de colecionadores
          </h2>
          <div className="my-4 flex flex-wrap items-center gap-3">
            <RatingStars value={nft.rating.average} />
            <p>
              {nft.rating.average.toLocaleString('pt-BR')} de 5 · {nft.rating.count} avaliações
            </p>
          </div>
          {nft.reviews.length ? (
            <ul className="divide-y divide-line">
              {nft.reviews.map((review) => (
                <li key={review.id} className="py-5">
                  <article>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="font-bold">{review.author}</h3>
                      <time dateTime={review.createdAt} className="text-xs text-sand">
                        {new Date(review.createdAt).toLocaleDateString('pt-BR', {
                          timeZone: 'UTC',
                        })}
                      </time>
                    </div>
                    <RatingStars value={review.rating} className="mt-2" />
                    <p className="mt-2 text-sm leading-6 text-sand">{review.comment}</p>
                  </article>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sand">Ainda não há avaliações para este NFT.</p>
          )}
        </section>
      </TabsContent>
    </Tabs>
  )
}
