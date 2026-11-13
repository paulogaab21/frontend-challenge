import { SiteLink as Link } from '@/components/layout/site-link'
import { HeartFilledIcon, HomeIcon, ProfileIcon, ScanIcon, ShopIcon } from '@/components/icons'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/components/ui/class-names'

export type MobileTab = 'inicio' | 'favoritos' | 'carrinho' | 'perfil'
export interface MobileTabBarProps {
  activeTab?: MobileTab | null
  cartCount?: number
  onAction?: () => void
  actionTo?: string
  actionLabel?: string
  navigationLabel?: string
  className?: string
}
const tabs = [
  { id: 'inicio', label: 'Início', to: '/', Icon: HomeIcon, left: '11.111%' },
  {
    id: 'favoritos',
    label: 'Favoritos',
    to: '/conta/favoritos',
    Icon: HeartFilledIcon,
    left: '28.502%',
  },
  { id: 'carrinho', label: 'Carrinho', to: '/carrinho', Icon: ShopIcon, left: '72.947%' },
  { id: 'perfil', label: 'Perfil', to: '/conta/perfil', Icon: ProfileIcon, left: '87.923%' },
] as const

export function MobileTabBar({
  activeTab = 'inicio',
  cartCount = 0,
  onAction,
  actionTo = '/conta/carteiras',
  actionLabel = 'Escanear carteira',
  navigationLabel = 'Navegação móvel',
  className,
}: MobileTabBarProps) {
  const actionClass =
    'absolute -top-[31px] left-1/2 flex size-[65px] -translate-x-1/2 items-center justify-center rounded-full bg-linear-to-b from-copper/40 to-copper text-cream hover:brightness-110'
  return (
    <nav
      aria-label={navigationLabel}
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 h-[calc(95px+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)]',
        className,
      )}
    >
      <svg
        className="pointer-events-none absolute inset-0 size-full text-surface"
        viewBox="0 801 414 95"
        preserveAspectRatio="none"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M282.85 801C269.09 801 256.87 809.2 251.02 821.65C243.26 838.17 226.46 849.62 207 849.62C187.54 849.62 170.74 838.18 162.98 821.65C157.13 809.2 144.9 801 131.15 801H28.93C12.95 801 0 813.95 0 829.93V896H414V829.93C414 813.95 401.05 801 385.07 801H282.85Z" />
      </svg>
      {tabs.map(({ id, label, to, Icon, left }) => (
        <Link
          key={id}
          to={to}
          aria-label={
            id === 'carrinho' && cartCount > 0
              ? `${label}, ${cartCount} ${cartCount === 1 ? 'item' : 'itens'}`
              : label
          }
          aria-current={activeTab === id ? 'page' : undefined}
          style={{ left }}
          className={cn(
            'absolute top-7 flex size-11 -translate-x-1/2 items-center justify-center rounded-md text-sand hover:text-amber',
            activeTab === id && 'text-amber',
          )}
        >
          <Icon size={20} />
          {id === 'carrinho' && cartCount > 0 && (
            <Badge variant="count" aria-hidden="true" className="absolute top-0 right-0">
              {cartCount > 99 ? '99+' : cartCount}
            </Badge>
          )}
          {activeTab === id && (
            <span
              aria-hidden="true"
              className="absolute bottom-0 h-[3px] w-3 rounded-full bg-copper"
            />
          )}
        </Link>
      ))}
      {onAction ? (
        <button type="button" onClick={onAction} aria-label={actionLabel} className={actionClass}>
          <ScanIcon />
        </button>
      ) : (
        <Link to={actionTo} aria-label={actionLabel} className={actionClass}>
          <ScanIcon />
        </Link>
      )}
    </nav>
  )
}
