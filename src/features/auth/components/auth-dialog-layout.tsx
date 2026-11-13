import type { ReactNode } from 'react'
import { SiteLink } from '@/components/layout/site-link'
import { DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
export interface AuthDialogLayoutProps {
  mode: 'login' | 'register'
  loginTo: string
  registerTo: string
  children: ReactNode
  social?: ReactNode
}
export function AuthDialogLayout({
  mode,
  loginTo,
  registerTo,
  children,
  social,
}: AuthDialogLayoutProps) {
  return (
    <div className={cn('min-h-[590px] w-full pt-12 pb-16', mode === 'register' && 'min-h-[646px]')}>
      <DialogTitle className="sr-only">{mode === 'login' ? 'Entrar' : 'Criar conta'}</DialogTitle>
      <nav
        aria-label="Autenticação"
        className="flex items-center justify-center gap-2 text-xl leading-5 font-medium"
      >
        <SiteLink
          to={loginTo}
          aria-current={mode === 'login' ? 'page' : undefined}
          className={cn(mode === 'login' && 'text-amber')}
        >
          Entrar
        </SiteLink>
        <span aria-hidden="true" className="h-5 border-l border-coral" />
        <SiteLink
          to={registerTo}
          aria-current={mode === 'register' ? 'page' : undefined}
          className={cn(mode === 'register' && 'text-amber')}
        >
          Criar conta
        </SiteLink>
      </nav>
      <DialogDescription className="mx-auto mt-10 max-w-[420px] px-2 text-center text-13 leading-4 text-cream">
        {mode === 'login'
          ? 'Entre para gerenciar sua carteira, coleção e perfil de criador.'
          : 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.'}
      </DialogDescription>
      <div className="mx-auto mt-6 w-[calc(100%-3rem)] max-w-[340px]">{children}</div>
      {social && <div className="mt-6">{social}</div>}
    </div>
  )
}
