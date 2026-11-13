import { type ReactNode } from 'react'

import { AppShell } from '@/app/app-shell'
import {
  ActivityIcon,
  DangerTriangleIcon,
  DownloadIcon,
  HeartIcon,
  LocationIcon,
  ShoppingIcon,
  UserIcon,
} from '@/components/icons'
import { type MobileTab } from '@/components/layout/mobile-tab-bar'
import { useLogout } from '@/features/auth/session'
import { useDocumentTitle } from '@/lib/use-document-title'

import { AccountLayout, type AccountMenuItem } from './components/account-layout'

export type AccountSection = 'perfil' | 'carteiras' | 'atividade' | 'favoritos'

/** Menu of the Figma. Areas outside this delivery lead to a page that says so. */
const MENU: AccountMenuItem[] = [
  { id: 'perfil', label: 'Dados do perfil', to: '/conta/perfil', icon: UserIcon },
  { id: 'carteiras', label: 'Carteiras', to: '/conta/carteiras', icon: LocationIcon },
  { id: 'atividade', label: 'Atividade', to: '/conta/atividade', icon: ShoppingIcon },
  { id: 'favoritos', label: 'Lista de interesse', to: '/conta/favoritos', icon: HeartIcon },
  { id: 'ofertas', label: 'Ofertas', to: '/em-breve/ofertas', icon: ActivityIcon },
  {
    id: 'downloads',
    label: 'Arquivos baixados',
    to: '/em-breve/arquivos-baixados',
    icon: DownloadIcon,
  },
  { id: 'suporte', label: 'Suporte', to: '/em-breve/suporte', icon: DangerTriangleIcon },
]

export interface AccountShellProps {
  section: AccountSection
  title: string
  children: ReactNode
}

/** Chrome shared by the account pages: site shell + "Meu perfil" menu + sign out. */
export function AccountShell({ section, title, children }: AccountShellProps) {
  useDocumentTitle(title)
  const logout = useLogout()
  const mobileTab: MobileTab = section === 'favoritos' ? 'favoritos' : 'perfil'

  return (
    <AppShell
      divider
      mobileTab={mobileTab}
      mobileTopBar={{ variant: 'inner', title: 'Meu perfil', backTo: '/' }}
    >
      <div className="container-page mt-2 md:mt-8">
        <AccountLayout
          active={section}
          items={MENU}
          onLogout={() => logout.mutate()}
          logoutPending={logout.isPending}
        >
          {children}
        </AccountLayout>
      </div>
    </AppShell>
  )
}
