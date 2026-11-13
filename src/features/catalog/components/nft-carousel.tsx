import { useEffect, useId, useRef, useState } from 'react'
import type { NftSummary } from '@/contracts'
import { ArrowLeft2Icon, ArrowRight2Icon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { NftCard } from './nft-card'
import { cn } from '@/lib/utils'
export interface NftCarouselProps {
  title: string
  items: NftSummary[]
  getHref: (nft: NftSummary) => string
}
export function NftCarousel({ title, items, getHref }: NftCarouselProps) {
  const id = useId()
  const track = useRef<HTMLUListElement>(null)
  const [page, setPage] = useState(0)
  const [pages, setPages] = useState(1)
  useEffect(() => {
    const el = track.current
    if (!el) return
    const observer = new ResizeObserver(() =>
      setPages(Math.max(1, Math.ceil(el.scrollWidth / el.clientWidth))),
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [items.length])
  const scroll = (next: number) => {
    const el = track.current
    if (!el) return
    el.scrollTo({
      left: Math.min(next * el.clientWidth, el.scrollWidth - el.clientWidth),
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    })
  }
  return (
    <section aria-labelledby={id} className="min-w-0">
      <div className="flex items-center justify-between border-b border-hairline pb-3">
        <h2 id={id} className="text-17 font-bold text-amber">
          {title}
        </h2>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={page === 0}
            onClick={() => scroll(page - 1)}
            aria-label={`Anterior: ${title}`}
          >
            <ArrowLeft2Icon />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={page >= pages - 1}
            onClick={() => scroll(page + 1)}
            aria-label={`Próximo: ${title}`}
          >
            <ArrowRight2Icon />
          </Button>
        </div>
      </div>
      <ul
        ref={track}
        aria-label={title}
        className="mt-8 flex snap-x snap-mandatory [scrollbar-width:none] gap-[26px] overflow-x-auto pb-2"
        onScroll={(event) => {
          const el = event.currentTarget
          setPage(
            el.scrollLeft >= el.scrollWidth - el.clientWidth - 1
              ? Math.max(0, Math.ceil(el.scrollWidth / el.clientWidth) - 1)
              : Math.round(el.scrollLeft / el.clientWidth),
          )
          setPages(Math.max(1, Math.ceil(el.scrollWidth / el.clientWidth)))
        }}
      >
        {items.map((nft) => (
          <li key={nft.id} className="w-[219px] shrink-0 snap-start">
            <NftCard nft={nft} to={getHref(nft)} isFavorite={false} variant="compact" />
          </li>
        ))}
      </ul>
      <div className="mt-6 flex justify-center gap-3">
        {Array.from({ length: pages }, (_, index) => (
          <button
            key={index}
            type="button"
            aria-label={`Ir para a página ${index + 1} de ${title}`}
            aria-current={index === page ? 'true' : undefined}
            onClick={() => scroll(index)}
            className="flex size-4 items-center justify-center"
          >
            <span
              className={cn(
                'size-3 rounded-full border border-copper',
                index === page && 'bg-copper',
              )}
            />
          </button>
        ))}
      </div>
    </section>
  )
}
