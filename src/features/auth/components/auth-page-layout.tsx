import type { ReactNode } from 'react'
import { SiteLink } from '@/components/layout/site-link'
import { cn } from '@/lib/utils'
export interface AuthPageLayoutProps {
  mode: 'login' | 'register'
  loginTo: string
  registerTo: string
  children: ReactNode
  social?: ReactNode
}
export function AuthPageLayout({
  mode,
  loginTo,
  registerTo,
  children,
  social,
}: AuthPageLayoutProps) {
  return (
    <div className="mx-auto w-full max-w-[470px] px-7 pt-[124px] pb-6">
      <SiteLink
        to="/"
        className="mx-auto block w-fit text-[32px] leading-[42px] font-bold tracking-brand"
        aria-label="Kurio — Início"
      >
        KURIO
      </SiteLink>
      <h1
        className={cn(
          'mt-[84px] text-center text-xl leading-7 font-bold',
          mode === 'register' && 'text-lg',
        )}
      >
        {mode === 'login' ? 'Entrar' : 'Criar perfil de colecionador'}
      </h1>
      <div className="mt-[34px]">{children}</div>
      {social && <div className="mt-10">{social}</div>}
      <p className="mt-10 text-center text-15 text-sand">
        {mode === 'login' ? (
          <>
            Novo na Kurio?{' '}
            <SiteLink to={registerTo} className="hover:text-amber hover:underline">
              Crie uma conta
            </SiteLink>
          </>
        ) : (
          <>
            Já tem uma conta?{' '}
            <SiteLink to={loginTo} className="hover:text-amber hover:underline">
              Entre
            </SiteLink>
          </>
        )}
      </p>
    </div>
  )
}
