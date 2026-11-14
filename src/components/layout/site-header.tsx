import { SiteLink as Link } from '@/components/layout/site-link'
import {
  ArrowDown2Icon,
  CartIcon,
  HeartIcon,
  LogoutIcon,
  SearchIcon,
  UserIcon,
  WalletIcon,
} from '@/components/icons'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/components/ui/class-names'

export type HeaderNav = 'inicio' | 'mercado' | 'criadores' | 'aprenda'
export interface SiteHeaderProps {
  activeNav?: HeaderNav | null
  cartCount?: number
  user?: { displayName: string; avatarUrl?: string | null } | null
  onSearch?: () => void
  onLogout?: () => void
  divider?: boolean
  navLinks?: Partial<Record<HeaderNav, string>>
  navigationLabel?: string
  className?: string
}
const navigation: { id: HeaderNav; label: string; to: string; hash?: string }[] = [
  { id: 'inicio', label: 'Início', to: '/' },
  { id: 'mercado', label: 'Mercado', to: '/', hash: 'mercado' },
  { id: 'criadores', label: 'Criadores', to: '/em-breve/criadores' },
  { id: 'aprenda', label: 'Aprenda', to: '/em-breve/aprenda' },
]

export function SiteHeader({
  activeNav = 'inicio',
  cartCount = 0,
  user = null,
  onSearch,
  onLogout,
  divider = false,
  navLinks,
  navigationLabel = 'Navegação principal',
  className,
}: SiteHeaderProps) {
  return (
    <header className={cn('container-page pt-6', className)}>
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-md bg-copper px-4 py-2 text-ink focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Pular para o conteúdo
      </a>
      <div
        className={cn(
          'relative flex min-h-[45px] flex-wrap items-start justify-between gap-x-6 gap-y-4 xl:flex-nowrap',
          divider && 'border-b border-hairline',
        )}
      >
        <Link
          to="/"
          aria-label="Kurio — Início"
          className="flex h-[35px] items-center text-sm font-bold tracking-brand"
        >
          KURIO
        </Link>
        <nav
          aria-label={navigationLabel}
          className="order-3 flex min-h-[45px] w-full flex-wrap justify-center gap-x-10 gap-y-3 xl:absolute xl:left-[31.333333%] xl:order-none xl:w-auto xl:flex-nowrap xl:gap-x-[40.6px]"
        >
          {navigation.map((item) => (
            <Link
              key={item.id}
              to={navLinks?.[item.id] ?? item.to}
              hash={navLinks?.[item.id] ? undefined : item.hash}
              aria-current={activeNav === item.id ? 'page' : undefined}
              className={cn(
                'flex h-[45px] items-start border-b-[3px] border-transparent text-base leading-5 text-cream hover:text-amber',
                activeNav === item.id && 'border-copper font-bold text-amber',
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex h-[35px] items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={onSearch}
            aria-label="Buscar NFTs"
          >
            <SearchIcon />
          </Button>
          <Link
            to="/carrinho"
            aria-label={`Carrinho${cartCount > 0 ? `, ${cartCount} ${cartCount === 1 ? 'item' : 'itens'}` : ', vazio'}`}
            className="relative flex size-8 items-center justify-center rounded-sm text-cream hover:text-amber"
          >
            <CartIcon />
            {cartCount > 0 && (
              <Badge variant="count" aria-hidden="true" className="absolute top-[3px] -right-[5px]">
                {cartCount > 99 ? '99+' : cartCount}
              </Badge>
            )}
          </Link>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="ml-4 h-[35px] max-w-44 px-1 text-sm font-medium"
                  aria-label={`Menu de ${user.displayName}`}
                >
                  <Avatar className="size-8">
                    <AvatarImage src={user.avatarUrl ?? undefined} alt="" />
                    <AvatarFallback aria-hidden="true">
                      <UserIcon size={16} />
                    </AvatarFallback>
                  </Avatar>
                  <span className="max-w-24 truncate">{user.displayName}</span>
                  <ArrowDown2Icon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link to="/conta/perfil">
                    <UserIcon />
                    Perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/conta/carteiras">
                    <WalletIcon />
                    Carteiras
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/conta/favoritos">
                    <HeartIcon />
                    Lista de interesse
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={onLogout}>
                  <LogoutIcon />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button size="header" className="ml-4 gap-1" asChild>
              {/* Target for returning focus when the sign-in dialog (a route) closes. */}
              <Link to="/entrar" data-auth-entry>
                <LogoutIcon />
                Entrar
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
