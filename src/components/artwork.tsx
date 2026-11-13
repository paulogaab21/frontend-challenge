import { artworks, type ArtworkFormat, type ArtworkId } from '@/assets/artworks'

// This pure helper is also used by document-level LCP image preloads.
// eslint-disable-next-line react-refresh/only-export-components
export function artworkSrcSet(id: ArtworkId, format: ArtworkFormat): string {
  return artworks[id].sources[format].map(({ src, width }) => `${src} ${width}w`).join(', ')
}

interface ArtworkProps {
  id: ArtworkId
  /** Actual rendered width, e.g. "(min-width: 768px) 320px, calc(100vw - 48px)". */
  sizes: string
  alt?: string
  priority?: boolean
  /** Applied to the picture wrapper; the image fills its dimensions. */
  className?: string
}

export function Artwork({ id, sizes, alt, priority = false, className }: ArtworkProps) {
  const artwork = artworks[id]

  return (
    <picture
      className={className}
      style={{
        display: 'block',
        aspectRatio: '1 / 1',
        overflow: 'hidden',
        backgroundColor: artwork.color,
        backgroundImage: `url("${artwork.placeholder}")`,
        backgroundSize: 'cover',
      }}
    >
      <source type="image/avif" srcSet={artworkSrcSet(id, 'avif')} sizes={sizes} />
      <source type="image/webp" srcSet={artworkSrcSet(id, 'webp')} sizes={sizes} />
      <img
        src={artwork.fallback}
        alt={alt ?? artwork.alt}
        width={artwork.width}
        height={artwork.height}
        sizes={sizes}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        decoding="async"
        style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </picture>
  )
}
