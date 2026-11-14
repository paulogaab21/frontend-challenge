/** The two measurements of a scrollable track the page count depends on. */
export interface TrackMetrics {
  clientWidth: number
  scrollWidth: number
}

/**
 * How many "screens" a horizontal track scrolls through.
 *
 * A track can momentarily have no width while keeping its content width — the
 * browser reports that in the middle of a viewport change (rotating a phone,
 * resizing the window). Dividing by it would ask for an infinite number of pages
 * and take the whole route down, so a track without width has a single page, and
 * the answer is never larger than the number of items.
 */
export function countPages(track: TrackMetrics, itemCount: number): number {
  if (!(track.clientWidth > 0)) return 1
  const pages = Math.ceil(track.scrollWidth / track.clientWidth)
  if (!Number.isFinite(pages)) return 1
  return Math.min(Math.max(1, pages), Math.max(1, itemCount))
}
