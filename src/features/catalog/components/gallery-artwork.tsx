import type { GalleryView } from '@/contracts'
import { Artwork } from '@/components/artwork'
import { cn } from '@/lib/utils'
export interface GalleryArtworkProps {
  view: GalleryView
  name: string
  sizes: string
  priority?: boolean
  className?: string
}
export function GalleryArtwork({ view, name, sizes, priority, className }: GalleryArtworkProps) {
  return (
    <div className={cn('aspect-square overflow-hidden', className)}>
      <div
        className="size-full"
        style={{
          transform: `scale(${view.zoom})`,
          transformOrigin: `${view.focus.x}% ${view.focus.y}%`,
        }}
      >
        <Artwork
          id={view.artwork}
          sizes={sizes}
          priority={priority}
          alt={`${name} — ${view.label}`}
          className="size-full"
        />
      </div>
    </div>
  )
}
