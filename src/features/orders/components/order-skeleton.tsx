import { useId } from 'react'

import { Skeleton } from '@/components/ui/skeleton'

import { OrderPanel } from './order-panel'

export interface OrderSkeletonProps {
  closeTo: string
  rows?: number
}

export function OrderSkeleton({ closeTo, rows = 3 }: OrderSkeletonProps) {
  const id = useId()
  return (
    <OrderPanel closeTo={closeTo} labelledBy={id}>
      <h1 id={id} className="sr-only">
        Carregando pedido
      </h1>
      <div role="status" aria-label="Carregando pedido">
        <div className="px-6 pt-[22px] pb-[14px]">
          <Skeleton className="mx-auto size-20" />
          <Skeleton className="mx-auto mt-4 h-6 w-full max-w-[356px]" />
        </div>
        <div className="grid grid-cols-2 gap-y-4 border-y border-copper px-6 py-[17px] md:grid-cols-4 md:px-9">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="space-y-1 px-2">
              <Skeleton className="h-[15px] w-full" />
              <Skeleton className="h-[19px] w-full" />
            </div>
          ))}
        </div>
        <div className="px-5 pt-5 md:px-11">
          <Skeleton className="mb-2 h-5 w-48 max-w-full" />
          <div className="grid h-7 grid-cols-[54%_18%_28%] items-start border-b border-copper/30 md:grid-cols-[60%_16%_24%]">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-5 w-4/5" />
            ))}
          </div>
          <div className="mt-3 space-y-3">
            {Array.from({ length: rows }, (_, index) => (
              <div
                key={index}
                className="grid min-h-[70px] grid-cols-[54%_18%_28%] items-center md:grid-cols-[60%_16%_24%]"
              >
                <div className="flex flex-col gap-2 pr-2 md:flex-row md:items-center md:gap-3">
                  <Skeleton className="size-[70px] shrink-0" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-full" />
                  </div>
                </div>
                <Skeleton className="h-5 w-4/5" />
                <Skeleton className="h-6 w-full" />
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-3 md:ml-[169px]">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
          </div>
          <div className="mt-3 border-t border-copper/30 pt-3 pb-[17px]">
            <Skeleton className="mx-auto h-[66px] w-full" />
            <Skeleton className="mx-auto mt-5 h-12 w-[186px] max-w-full" />
            <Skeleton className="mx-auto mt-3 h-4 w-full" />
          </div>
        </div>
      </div>
    </OrderPanel>
  )
}
