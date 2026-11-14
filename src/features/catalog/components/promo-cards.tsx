import type { ArtworkId } from '@/contracts'
import { Artwork } from '@/components/artwork'
import { ArrowRightIcon } from '@/components/icons'
import { SiteLink } from '@/components/layout/site-link'
import { Button } from '@/components/ui/button'
export interface PromoCardContent {
  id: string
  /** One entry per line, as broken in the layout. */
  title: string[]
  description: string[]
  artwork: ArtworkId
  to: string
  ctaLabel?: string
}
export interface PromoCardsProps {
  items?: PromoCardContent[]
}
const defaults: PromoCardContent[] = [
  {
    id: 'genesis',
    title: ['Lançamentos gênesis', 'de edição limitada'],
    description: [
      'Colecione edições escassas',
      'diretamente dos criadores antes',
      'da revelação pública.',
    ],
    artwork: 'emerald-ape',
    to: '/em-breve/lancamentos',
  },
  {
    id: 'curadoria',
    title: ['Arte digital selecionada', 'e muito mais'],
    description: [
      'Explore novos artistas,',
      'coleções verificadas e obras',
      'digitais que definem a',
      'cultura.',
    ],
    artwork: 'ivory-baron',
    to: '/em-breve/curadoria',
  },
]
export function PromoCards({ items = defaults }: PromoCardsProps) {
  return (
    <div className="grid gap-7 xl:grid-cols-2">
      {items.map((item) => (
        <article
          key={item.id}
          className="relative grid grid-cols-1 overflow-hidden rounded-lg bg-surface md:h-[250px] md:grid-cols-[287px_minmax(0,1fr)]"
        >
          <div className="h-[200px] overflow-hidden rounded-[18px] md:h-[250px]">
            <Artwork
              id={item.artwork}
              sizes="(min-width: 1280px) 292px, (min-width: 768px) calc((100vw - 48px) / 2), calc(100vw - 48px)"
              alt=""
              className="h-full w-full"
            />
          </div>
          <div className="relative z-10 flex flex-col items-end px-4 py-6 text-right md:pt-[37px] md:pr-[30px] md:pb-[46px] md:pl-0">
            <h2 className="text-base leading-6 font-bold md:text-lg">
              {item.title.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </h2>
            <p className="mt-[9px] text-xs leading-6 text-sand md:text-sm">
              {item.description.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </p>
            <Button
              asChild
              className="mt-4 w-[140px] max-w-full gap-px text-sm font-medium md:absolute md:right-[30px] md:bottom-[46px] md:mt-0"
            >
              <SiteLink to={item.to}>
                {item.ctaLabel ?? 'Explorar'}
                <ArrowRightIcon size={18} />
              </SiteLink>
            </Button>
          </div>
          {/* The two copper rings of the layout, centred outside the bottom-left corner. */}
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute top-0 left-0 hidden h-[250px] w-[586px] text-copper md:block"
            viewBox="0 0 586 250"
            fill="none"
          >
            <circle cx="-63" cy="270" r="127" stroke="currentColor" strokeWidth="2" />
            <circle cx="-71" cy="262" r="127.5" stroke="currentColor" />
          </svg>
        </article>
      ))}
    </div>
  )
}
