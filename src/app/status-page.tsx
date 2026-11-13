import type { ReactNode } from 'react'

import { useDocumentTitle } from '@/lib/use-document-title'

import { AppShell } from './app-shell'

export interface StatusPageProps {
  /** Short label above the title ("Erro 404"). */
  eyebrow?: string
  title: string
  description: ReactNode
  /** Buttons / links offered as the way forward. */
  actions?: ReactNode
  /** `alert` for failures the collector did not expect; plain content otherwise. */
  role?: 'alert'
}

/** Full-page message inside the site chrome: not found, failure, out-of-scope area. */
export function StatusPage({ eyebrow, title, description, actions, role }: StatusPageProps) {
  useDocumentTitle(title)
  return (
    <AppShell mobileTopBar={{ variant: 'inner', title: 'Kurio', backTo: '/' }}>
      <section
        role={role}
        className="container-page flex min-h-[420px] flex-col items-center justify-center py-16 text-center"
      >
        {eyebrow && (
          <p className="text-sm font-medium tracking-brand text-amber uppercase">{eyebrow}</p>
        )}
        <h1 className="mt-3 text-2xl leading-9 font-bold md:text-28">{title}</h1>
        <div className="mt-4 max-w-[560px] text-sm leading-6 text-sand">{description}</div>
        {actions && <div className="mt-8 flex flex-wrap justify-center gap-3">{actions}</div>}
      </section>
    </AppShell>
  )
}
