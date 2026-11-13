import type { ComponentProps } from 'react'
import { Link } from '@tanstack/react-router'

import { parseSearch } from '@/lib/search-params'

/**
 * Link for presentational components that receive their destination as a plain
 * string ("/carrinho", "/?categoria=musica#mercado"). The string is split into
 * path, search and hash so TanStack Router still owns the navigation — preloading,
 * history and search serialization included.
 */
export type SiteLinkProps = Omit<ComponentProps<'a'>, 'href'> & {
  to: string
  /** Overrides the hash that may be present in `to`. */
  hash?: string
  /** Replaces the current history entry instead of adding one. */
  replace?: boolean
}

export function SiteLink({ to, hash, ...props }: SiteLinkProps) {
  const url = new URL(to, 'http://kurio.local')
  return (
    <Link
      to={url.pathname}
      search={parseSearch(url.search)}
      hash={hash ?? (url.hash ? url.hash.slice(1) : undefined)}
      {...props}
    />
  )
}
