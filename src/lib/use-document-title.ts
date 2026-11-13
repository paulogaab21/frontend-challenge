import { useEffect } from 'react'

const SITE_NAME = 'Kurio'
const DEFAULT_TITLE = 'Kurio — Marketplace de NFTs'

/**
 * Sets the document title for the page on screen ("Carrinho — Kurio"). The title
 * is the first thing a screen reader announces after a navigation. `null` keeps
 * the site's default title.
 */
export function useDocumentTitle(title: string | null | undefined): void {
  useEffect(() => {
    document.title = title ? `${title} — ${SITE_NAME}` : DEFAULT_TITLE
  }, [title])
}
