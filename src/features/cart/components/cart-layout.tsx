import type { ReactNode } from 'react'

export interface CartLayoutProps {
  notices?: ReactNode
  items: ReactNode
  summary: ReactNode
}

export function CartLayout({ notices, items, summary }: CartLayoutProps) {
  return (
    <div className="mx-auto w-full max-w-[1248px] md:px-6">
      <div className="grid min-w-0 grid-cols-1 gap-y-1 min-[1280px]:grid-cols-[minmax(0,782px)_332px] min-[1280px]:gap-x-[86px]">
        {notices && <div className="px-7 pb-5 md:col-span-full md:px-0">{notices}</div>}
        <div className="min-w-0 px-7 md:px-0">{items}</div>
        <div className="min-w-0 min-[1280px]:mt-0 min-[1280px]:max-w-none md:mt-8 md:max-w-[480px]">
          {summary}
        </div>
      </div>
    </div>
  )
}
