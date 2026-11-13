import type { ReactNode } from 'react'
import { MobileTabBar, type MobileTabBarProps } from '@/components/layout/mobile-tab-bar'
import { MobileTopBar, type MobileTopBarProps } from '@/components/layout/mobile-top-bar'
import { SiteFooter, type SiteFooterProps } from '@/components/layout/site-footer'
import { SiteHeader, type SiteHeaderProps } from '@/components/layout/site-header'
import { cn } from '@/components/ui/class-names'

export interface PageShellProps {
  children: ReactNode
  header?: SiteHeaderProps
  footer?: SiteFooterProps | false
  mobileTopBar?: MobileTopBarProps | false
  mobileTabBar?: MobileTabBarProps | false
  className?: string
  mainClassName?: string
}
export function PageShell({
  children,
  header,
  footer,
  mobileTopBar,
  mobileTabBar,
  className,
  mainClassName,
}: PageShellProps) {
  return (
    <div
      className={cn(
        'min-h-dvh',
        mobileTabBar !== false && 'pb-[calc(126px+env(safe-area-inset-bottom))] md:pb-0',
        className,
      )}
    >
      <div className="hidden md:block">
        <SiteHeader {...header} />
      </div>
      <div className="md:hidden">
        <nav aria-label="Atalho para o conteúdo">
          <a
            href="#conteudo"
            className="sr-only z-50 rounded-md bg-copper px-4 py-2 text-ink focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
          >
            Pular para o conteúdo
          </a>
        </nav>
        {mobileTopBar !== false && <MobileTopBar {...(mobileTopBar ?? { variant: 'home' })} />}
      </div>
      <main id="conteudo" tabIndex={-1} className={cn('min-w-0', mainClassName)}>
        {children}
      </main>
      {footer !== false && (
        <div className="mt-24 hidden md:block">
          <SiteFooter {...footer} />
        </div>
      )}
      {mobileTabBar !== false && (
        <div className="md:hidden">
          <MobileTabBar {...mobileTabBar} />
        </div>
      )}
    </div>
  )
}
