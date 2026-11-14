import type { ComponentType, ReactNode } from 'react'
import {
  ActivityIcon,
  AccountLogoutIcon,
  DangerTriangleIcon,
  DownloadIcon,
  HeartIcon,
  LocationIcon,
  ShoppingIcon,
  UserIcon,
  type IconProps,
} from '@/components/icons'
import { SiteLink } from '@/components/layout/site-link'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
export interface AccountMenuItem {
  id: string
  label: string
  to: string
  icon: ComponentType<IconProps>
}
export interface AccountLayoutProps {
  active: string
  items?: AccountMenuItem[]
  onLogout: () => void
  logoutPending?: boolean
  children: ReactNode
}
const defaults: AccountMenuItem[] = [
  { id: 'perfil', label: 'Dados do perfil', to: '/conta/perfil', icon: UserIcon },
  { id: 'carteiras', label: 'Carteiras', to: '/conta/carteiras', icon: LocationIcon },
  { id: 'atividade', label: 'Atividade', to: '/em-breve/atividade', icon: ShoppingIcon },
  { id: 'favoritos', label: 'Lista de interesse', to: '/conta/favoritos', icon: HeartIcon },
  { id: 'ofertas', label: 'Ofertas', to: '/em-breve/ofertas', icon: ActivityIcon },
  { id: 'downloads', label: 'Arquivos baixados', to: '/em-breve/downloads', icon: DownloadIcon },
  { id: 'suporte', label: 'Suporte', to: '/em-breve/suporte', icon: DangerTriangleIcon },
]
export function AccountLayout({
  active,
  items = defaults,
  onLogout,
  logoutPending,
  children,
}: AccountLayoutProps) {
  return (
    <div className="grid min-w-0 gap-7 lg:grid-cols-[310px_minmax(0,1fr)]">
      <aside className="min-w-0 self-start bg-surface">
        <h2 className="px-2.5 pt-3 pb-1 text-lg font-bold">Meu perfil</h2>
        <nav aria-label="Menu da conta">
          <ul className="flex overflow-x-auto lg:block">
            {items.map(({ id, label, to, icon: Icon }) => (
              <li key={id} className="shrink-0">
                <SiteLink
                  to={to}
                  aria-current={active === id ? 'page' : undefined}
                  className={cn(
                    'flex min-h-[45px] items-center gap-3 border-b-[3px] border-transparent px-4 text-15 text-amber lg:border-b-0 lg:border-l-[6px] lg:pl-2.5',
                    id === 'perfil' && 'lg:gap-4',
                    id === 'carteiras' && 'lg:gap-3.5',
                    (id === 'ofertas' || id === 'downloads' || id === 'suporte') && 'lg:gap-2.5',
                    active === id && 'border-copper',
                  )}
                >
                  <Icon
                    size={
                      id === 'favoritos'
                        ? 16
                        : ['ofertas', 'downloads', 'suporte'].includes(id)
                          ? 20
                          : 18
                    }
                    className={active === id ? 'text-copper' : 'text-khaki'}
                  />
                  {label}
                </SiteLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-t border-hairline">
          <Button
            variant="link"
            className="flex h-[47px] items-center gap-2 px-4 pb-[9px] text-15 font-bold"
            onClick={onLogout}
            loading={logoutPending}
          >
            <AccountLogoutIcon />
            Sair
          </Button>
        </div>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  )
}
