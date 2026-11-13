import { useState, type ReactNode } from 'react'

import type { MobileTab } from '@/components/layout/mobile-tab-bar'
import type { MobileTopBarProps } from '@/components/layout/mobile-top-bar'
import { PageShell } from '@/components/layout/page-shell'
import type { FooterLinkColumn } from '@/components/layout/site-footer'
import type { HeaderNav } from '@/components/layout/site-header'
import { useLogout, useSession } from '@/features/auth/session'
import { cn } from '@/lib/utils'
import { useCartCount } from '@/features/cart/queries'

import { SearchDialog } from './search-dialog'

export interface AppShellProps {
  children: ReactNode
  /** Item highlighted in the desktop navigation. */
  activeNav?: HeaderNav | null
  /** The hairline under the desktop header (drawn on some frames only). */
  divider?: boolean
  /** Mobile top bar, or `false` for screens that draw their own header. */
  mobileTopBar?: MobileTopBarProps | false
  /** Tab highlighted in the mobile bottom bar, or `false` to hide the bar. */
  mobileTab?: MobileTab | null | false
  /** `false` hides the desktop footer. */
  footer?: boolean
  /** Search term applied to the catalog (prefills the search dialog). */
  searchTerm?: string
  mainClassName?: string
}

/** Destinations of the footer. Areas outside this delivery go to an explanatory page. */
const FOOTER_COLUMNS: readonly FooterLinkColumn[] = [
  {
    title: 'Meu perfil',
    links: [
      { label: 'Meu perfil', to: '/conta/perfil' },
      { label: 'Minha coleção', to: '/em-breve/minha-colecao' },
      { label: 'Atividade', to: '/conta/atividade' },
      { label: 'Estúdio do criador', to: '/em-breve/estudio-do-criador' },
      { label: 'Lista de interesse', to: '/conta/favoritos' },
    ],
  },
  {
    title: 'Central de ajuda',
    links: [
      { label: 'Central de ajuda', to: '/em-breve/central-de-ajuda' },
      { label: 'Como comprar NFTs', to: '/em-breve/como-comprar-nfts' },
      { label: 'Carteira e segurança', to: '/em-breve/carteira-e-seguranca' },
      { label: 'Política do mercado', to: '/em-breve/politica-do-mercado' },
      { label: 'Denunciar item', to: '/em-breve/denunciar-item' },
    ],
  },
  {
    title: 'Coleções',
    links: [
      { label: 'Arte digital', to: '/?categoria=arte-digital#mercado' },
      { label: 'Fotografia', to: '/?categoria=fotografia#mercado' },
      { label: 'Música', to: '/?categoria=musica#mercado' },
      { label: 'Arte 3D', to: '/?categoria=arte-3d#mercado' },
      { label: 'Utilidade', to: '/?categoria=utilidade#mercado' },
    ],
  },
]

const NAV_LINKS = {
  mercado: '/#mercado',
  criadores: '/em-breve/criadores',
  aprenda: '/em-breve/aprenda',
} as const

/**
 * The site chrome wired to application state: who is signed in, how many items
 * the cart holds, sign out and the catalog search. Pages pass only what is
 * specific to them (active navigation item, mobile bars).
 */
export function AppShell({
  children,
  activeNav = null,
  divider = false,
  mobileTopBar,
  mobileTab = null,
  footer = true,
  searchTerm,
  mainClassName,
}: AppShellProps) {
  const { isAuthenticated, user } = useSession()
  const cartCount = useCartCount()
  const logout = useLogout()
  const [searchOpen, setSearchOpen] = useState(false)
  const [newsletterMessage, setNewsletterMessage] = useState<string>()

  // While the user object is loading the header already shows the account menu.
  const headerUser = isAuthenticated
    ? { displayName: user?.displayName ?? 'Minha conta', avatarUrl: user?.avatarUrl ?? null }
    : null

  return (
    <>
      <PageShell
        header={{
          activeNav,
          divider,
          cartCount,
          user: headerUser,
          navLinks: NAV_LINKS,
          onSearch: () => setSearchOpen(true),
          onLogout: () => logout.mutate(),
        }}
        footer={
          footer && {
            linkColumns: FOOTER_COLUMNS,
            newsletterMessage,
            // Out of scope: say so instead of pretending the e-mail was registered.
            onNewsletterSubmit: () =>
              setNewsletterMessage(
                'A newsletter não faz parte desta demonstração: nenhum e-mail foi cadastrado.',
              ),
          }
        }
        mobileTopBar={mobileTopBar}
        mobileTabBar={mobileTab === false ? false : { activeTab: mobileTab, cartCount }}
        // No outline: <main> only takes focus as the target of the skip link and of
        // route changes.
        mainClassName={cn('focus:outline-none', mainClassName)}
      >
        {children}
      </PageShell>
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} defaultValue={searchTerm} />
    </>
  )
}
