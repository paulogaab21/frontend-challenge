import { SiteLink } from '@/components/layout/site-link'
import type { ReactNode } from 'react'
export interface ShowcaseControlsProps {
  children?: ReactNode
  title?: string
}
export function ShowcaseControls({
  children,
  title = 'Demonstração dos estados',
}: ShowcaseControlsProps) {
  return (
    <aside aria-label={title} className="container-page my-12 border-t border-line py-8">
      <h2 className="mb-4 text-lg font-bold">{title}</h2>
      <nav
        aria-label="Catálogos de desenvolvimento"
        className="mb-5 flex flex-wrap gap-4 text-amber"
      >
        <SiteLink to="/dev/catalog">Catálogo</SiteLink>
        <SiteLink to="/dev/nft">NFT</SiteLink>
        <SiteLink to="/dev/auth">Autenticação</SiteLink>
        <SiteLink to="/dev/account">Conta</SiteLink>
      </nav>
      <div className="flex flex-wrap gap-3">{children}</div>
    </aside>
  )
}
