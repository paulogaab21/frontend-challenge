import { useEffect, useRef, useState } from 'react'
import type { ArtworkId } from '@/contracts'
import { Artwork } from '@/components/artwork'
import { ArrowRightIcon } from '@/components/icons'
import { SiteLink } from '@/components/layout/site-link'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { HeroDecoration } from './hero-decoration'
export interface HeroSlide {
  id: string
  eyebrow: string
  title: string[]
  description: string
  ctaLabel: string
  ctaTo: string
  artwork: ArtworkId
  artworkAlt?: string
  secondaryArtwork?: ArtworkId
  mobileTitle?: string[]
  mobileDescription?: string
}
export interface HeroCarouselProps {
  slides: HeroSlide[]
  headingLevel?: 1 | 2 | 3
  autoplay?: boolean
  intervalMs?: number
}
export function HeroCarousel({
  slides,
  headingLevel = 1,
  autoplay = false,
  intervalMs = 6000,
}: HeroCarouselProps) {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const root = useRef<HTMLElement>(null)
  useEffect(() => {
    if (!autoplay || paused || hovered || focused || slides.length < 2) return
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    let timer: ReturnType<typeof setInterval> | undefined
    const update = () => {
      clearInterval(timer)
      if (!media.matches)
        timer = setInterval(
          () => setActive((index) => (index + 1) % slides.length),
          Math.max(3000, intervalMs),
        )
    }
    update()
    media.addEventListener('change', update)
    return () => {
      clearInterval(timer)
      media.removeEventListener('change', update)
    }
  }, [autoplay, paused, hovered, focused, slides.length, intervalMs])
  const Heading = `h${headingLevel}` as const
  if (!slides.length) return null
  return (
    <section
      ref={root}
      aria-roledescription="carrossel"
      aria-label="Destaques"
      className="relative min-w-0"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false)
      }}
    >
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          hidden={index !== active}
          aria-roledescription="destaque"
          aria-label={`${index + 1} de ${slides.length}`}
          className="relative overflow-hidden rounded-[30px] bg-linear-to-br from-copper/20 to-copper/10 md:min-h-[450px] md:overflow-visible md:rounded-none md:bg-none"
        >
          <HeroDecoration />
          <div className="relative grid min-h-[190px] grid-cols-[minmax(0,1fr)_clamp(114px,calc(100vw_-_276px),138px)] gap-1 px-4 pt-1.5 pb-3 md:min-h-[450px] md:grid-cols-2 md:items-start md:gap-8 md:p-0 xl:grid-cols-[minmax(0,1fr)_450px]">
            <div className="min-w-0 md:pt-6 md:pl-0 xl:pt-10 xl:pl-10">
              <p className="text-xs leading-4 font-medium md:text-sm md:leading-6 md:tracking-brand">
                {slide.eyebrow}
              </p>
              <Heading className="mt-2 text-lg leading-[29px] font-bold md:mt-1 md:text-28 md:leading-[42px] xl:text-hero xl:leading-[70px]">
                <span className="hidden md:block">
                  {slide.title.map((line, i) => (
                    <span key={i} className="block">
                      {line}
                    </span>
                  ))}
                </span>
                <span className="md:hidden">
                  {(slide.mobileTitle ?? slide.title).map((line, i) => (
                    <span key={i} className="block">
                      {line}
                    </span>
                  ))}
                </span>
              </Heading>
              <p className="mt-1 hidden max-w-[590px] text-sm leading-6 text-sand md:block">
                {slide.description}
              </p>
              <p className="mt-2 text-xs leading-[18px] text-sand md:hidden">
                {slide.mobileDescription ?? slide.description}
              </p>
              <Button asChild className="mt-0 hidden w-[140px] md:mt-8 md:inline-flex">
                <SiteLink to={slide.ctaTo}>{slide.ctaLabel}</SiteLink>
              </Button>
              <SiteLink
                to={slide.ctaTo}
                className="mt-0 inline-flex items-center gap-1 text-xs font-bold text-amber md:hidden"
              >
                {slide.ctaLabel}
                <ArrowRightIcon size={16} />
              </SiteLink>
            </div>
            <div className="relative translate-y-[4.5px] md:translate-y-0">
              <Artwork
                id={slide.artwork}
                alt={slide.artworkAlt}
                sizes="(min-width: 1280px) 450px, (min-width: 768px) calc((100vw - 80px) / 2), 138px"
                priority={index === 0}
                className="w-full rounded-3xl md:rounded-4xl"
              />
              {slide.secondaryArtwork && (
                <div className="absolute top-[88px] left-[14px] w-[58px] md:hidden">
                  <Artwork
                    id={slide.secondaryArtwork}
                    alt=""
                    sizes="58px"
                    className="w-full rounded-3xl"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
      <div
        role="group"
        aria-label="Selecionar destaque"
        className="absolute bottom-1 left-1/2 flex -translate-x-1/2 items-center md:bottom-[39px] md:left-[51.6667%]"
      >
        {slides.map((slide, index) => (
          <button
            type="button"
            key={slide.id}
            aria-label={`Ir para o destaque ${index + 1}`}
            aria-current={active === index ? 'true' : undefined}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                event.preventDefault()
                const next =
                  (active + (event.key === 'ArrowRight' ? 1 : slides.length - 1)) % slides.length
                setActive(next)
                const buttons =
                  event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('button')
                buttons?.[next]?.focus()
              }
            }}
            onClick={() => setActive(index)}
            // 24px hit area around the 8px dot: the minimum target size of WCAG 2.5.8.
            className="flex size-6 items-center justify-center rounded-full"
          >
            <span
              className={cn(
                'size-[7px] rounded-full bg-copper md:size-2',
                active === index && 'ring-1 ring-copper ring-offset-2 ring-offset-ink',
              )}
            />
          </button>
        ))}
      </div>
      {autoplay && (
        <button
          type="button"
          aria-pressed={paused}
          onClick={() => setPaused((value) => !value)}
          className="absolute right-2 bottom-1 rounded-sm bg-ink/70 px-2 text-10 text-sand"
        >
          {paused ? 'Reproduzir destaques' : 'Pausar destaques'}
        </button>
      )}
    </section>
  )
}
