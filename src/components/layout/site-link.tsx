import type { ComponentProps } from 'react'
import { Link } from '@tanstack/react-router'

// The shell is merged before feature routes exist. Keep destination strings at
// this boundary; TanStack Router still owns navigation and link semantics.
export type SiteLinkProps = Omit<ComponentProps<'a'>, 'href'> & { to: string; hash?: string }

export function SiteLink({ to, ...props }: SiteLinkProps) {
  return <Link to={to} {...props} />
}
