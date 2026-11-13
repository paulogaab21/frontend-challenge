import type { ReactNode } from 'react'

import { CloseIcon } from '@/components/icons'
import { SiteLink } from '@/components/layout/site-link'

export interface OrderPanelProps {
  children: ReactNode
  closeTo: string
  labelledBy: string
}

export function OrderPanel({ children, closeTo, labelledBy }: OrderPanelProps) {
  return (
    <section
      aria-labelledby={labelledBy}
      className="relative mx-auto mt-6 w-[calc(100%_-_48px)] max-w-[578px] min-w-0 border-b-[10px] border-copper bg-surface md:mt-[166px]"
    >
      <SiteLink
        to={closeTo}
        aria-label="Fechar e voltar ao início"
        className="absolute top-1 right-1 z-10 flex size-11 items-center justify-center text-copper hover:bg-surface-raised"
      >
        <CloseIcon size={14} />
      </SiteLink>
      {children}
    </section>
  )
}
