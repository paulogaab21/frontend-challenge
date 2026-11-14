import { useId, useRef, useState } from 'react'
import type { GalleryView } from '@/contracts'
import { BackIcon, HeartFilledIcon, HeartIcon, ZoomIcon } from '@/components/icons'
import { SiteLink } from '@/components/layout/site-link'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { GalleryArtwork } from './gallery-artwork'
export interface NftGalleryProps {
  views: GalleryView[]
  name: string
  backTo?: string
  onBack?: () => void
  isFavorite?: boolean
  onToggleFavorite?: () => void
  favoritePending?: boolean
  priority?: boolean
}
export function NftGallery({
  views,
  name,
  backTo = '/',
  onBack,
  isFavorite = false,
  onToggleFavorite,
  favoritePending,
  priority = true,
}: NftGalleryProps) {
  const [selected, setSelected] = useState(0)
  const [zoomOpen, setZoomOpen] = useState(false)
  const zoomTrigger = useRef<HTMLButtonElement | null>(null)
  const mobileTrack = useRef<HTMLDivElement>(null)
  const id = useId()
  const view = views[selected] ?? views[0]
  const select = (index: number) => {
    setSelected(index)
    const track = mobileTrack.current
    track?.scrollTo({
      left: index * track.clientWidth,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    })
  }
  if (!view) return null
  return (
    <section
      aria-label={`Galeria de ${name}`}
      className="relative min-w-0 md:w-full md:max-w-[572px]"
    >
      <div className="hidden grid-cols-[100px_minmax(0,1fr)] gap-7 md:grid">
        <div
          role="tablist"
          tabIndex={-1}
          aria-label="Vistas da obra"
          aria-orientation="vertical"
          className="flex flex-col gap-4"
          onKeyDown={(event) => {
            const next =
              event.key === 'ArrowDown' || event.key === 'ArrowRight'
                ? (selected + 1) % views.length
                : event.key === 'ArrowUp' || event.key === 'ArrowLeft'
                  ? (selected + views.length - 1) % views.length
                  : event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? views.length - 1
                      : -1
            if (next >= 0) {
              event.preventDefault()
              select(next)
              event.currentTarget.querySelectorAll<HTMLButtonElement>('[role=tab]')[next]?.focus()
            }
          }}
        >
          {views.map((item, index) => (
            <button
              type="button"
              key={item.id}
              id={`${id}-tab-${index}`}
              role="tab"
              tabIndex={selected === index ? 0 : -1}
              aria-selected={selected === index}
              aria-controls={`${id}-stage`}
              aria-label={item.label}
              onClick={() => select(index)}
              className={cn(
                'size-[100px] overflow-hidden rounded-lg border border-transparent bg-surface',
                selected === index && 'border-copper',
              )}
            >
              <GalleryArtwork
                view={item}
                name={name}
                sizes={`${Math.ceil(100 * item.zoom)}px`}
                className="size-full"
              />
            </button>
          ))}
        </div>
        <div
          className="relative mt-0.5 aspect-square self-start rounded-md bg-surface p-5"
          id={`${id}-stage`}
          role="tabpanel"
          aria-labelledby={`${id}-tab-${selected}`}
        >
          <GalleryArtwork
            view={view}
            name={name}
            sizes={
              view.zoom > 1
                ? `${Math.ceil(404 * view.zoom)}px`
                : '(min-width:1280px) 404px, (min-width:1024px) 34vw, 42vw'
            }
            priority={priority}
            className="rounded-4xl"
          />
          <Button
            variant="icon"
            size="icon"
            className="absolute top-3 right-3 size-[30px] rounded-full"
            onClick={(event) => {
              zoomTrigger.current = event.currentTarget
              setZoomOpen(true)
            }}
            aria-label="Ampliar obra"
          >
            <ZoomIcon size={24} />
          </Button>
        </div>
      </div>
      <div className="relative h-[calc(100vw+92px)] bg-linear-to-br from-surface to-surface-raised md:hidden">
        <div className="absolute inset-x-7 top-[23px] z-10 flex justify-between">
          {onBack ? (
            <Button
              variant="icon"
              size="icon"
              className="rounded-full text-sand"
              onClick={onBack}
              aria-label="Voltar"
            >
              <BackIcon />
            </Button>
          ) : (
            <Button variant="icon" size="icon" className="rounded-full text-sand" asChild>
              <SiteLink to={backTo} aria-label="Voltar">
                <BackIcon />
              </SiteLink>
            </Button>
          )}
          {onToggleFavorite && (
            <Button
              variant="icon"
              size="icon"
              className="rounded-full text-amber"
              aria-label={isFavorite ? 'Remover dos favoritos' : 'Favoritar'}
              aria-pressed={isFavorite}
              loading={favoritePending}
              onClick={onToggleFavorite}
            >
              {isFavorite ? <HeartFilledIcon size={16} /> : <HeartIcon size={16} />}
            </Button>
          )}
        </div>
        <div
          ref={mobileTrack}
          className="absolute inset-x-0 top-[66px] flex snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto"
          onScroll={(event) => {
            const track = event.currentTarget
            if (track.clientWidth) setSelected(Math.round(track.scrollLeft / track.clientWidth))
          }}
        >
          {views.map((item, index) => (
            <div key={item.id} className="w-full shrink-0 snap-center px-7">
              <button
                type="button"
                onClick={(event) => {
                  zoomTrigger.current = event.currentTarget
                  setSelected(index)
                  setZoomOpen(true)
                }}
                className="block w-full rounded-4xl"
                aria-label={`Ampliar: ${item.label}`}
              >
                <GalleryArtwork
                  view={item}
                  name={name}
                  sizes="calc(100vw - 56px)"
                  priority={priority && index === 0}
                  className="rounded-4xl"
                />
              </button>
            </div>
          ))}
        </div>
        <div className="absolute inset-x-0 bottom-[128px] z-10 flex justify-center gap-1">
          {views.map((item, index) => (
            <button
              type="button"
              key={item.id}
              aria-label={`Ver ${item.label}`}
              aria-current={selected === index ? 'true' : undefined}
              onClick={() => select(index)}
              className="flex h-6 min-w-5 items-center justify-center"
            >
              <span
                className={cn(
                  'h-[7px] w-[7px] rounded-full bg-copper',
                  selected === index && 'w-7',
                )}
              />
            </button>
          ))}
        </div>
      </div>
      <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
        <DialogContent
          className="w-[calc(100%-2rem)] max-w-[900px] p-4 pt-12"
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            zoomTrigger.current?.focus()
          }}
        >
          <DialogTitle className="sr-only">
            {name} — {view.label}
          </DialogTitle>
          <DialogDescription className="sr-only">Visualização ampliada da obra.</DialogDescription>
          <GalleryArtwork
            view={view}
            name={name}
            sizes="(min-width:960px) 868px, calc(100vw - 64px)"
            className="mx-auto max-h-[75dvh] w-full max-w-[75dvh] rounded-3xl"
          />
        </DialogContent>
      </Dialog>
    </section>
  )
}
