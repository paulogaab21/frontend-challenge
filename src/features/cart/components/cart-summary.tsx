import { useId } from 'react'

import { SiteLink } from '@/components/layout/site-link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import type { AppliedCoupon, Quote } from '@/contracts'
import { formatEth, isZeroEth } from '@/lib/money'

export interface CartSummaryProps {
  quote: Quote | undefined
  loading: boolean
  refreshing?: boolean
  error?: string
  onRetry?: () => void
  coupon: {
    applied: AppliedCoupon | null
    pending: boolean
    error?: string
    onApply: (code: string) => void
    onRemove: () => void
  }
  checkoutTo: string
  checkoutDisabledReason?: string
  continueTo: string
}

export function CartSummary({
  quote,
  loading,
  refreshing,
  error,
  onRetry,
  coupon,
  checkoutTo,
  checkoutDisabledReason,
  continueTo,
}: CartSummaryProps) {
  const id = useId()
  const unavailable = loading || !quote || Boolean(error)
  const disabled = unavailable || Boolean(checkoutDisabledReason)
  const amount = (value: string | undefined, discount = false) =>
    loading ? (
      <Skeleton className="h-5 w-[110px]" />
    ) : value === undefined ? (
      '—'
    ) : discount ? (
      isZeroEth(value) ? (
        '(-) 00.00'
      ) : (
        `(-) ${formatEth(value)}`
      )
    ) : (
      formatEth(value)
    )
  return (
    <section
      aria-labelledby={`${id}-title`}
      aria-busy={loading || refreshing || undefined}
      className="min-w-0 rounded-t-[40px] bg-surface px-6 pt-6 pb-9 md:rounded-none md:bg-transparent md:p-0"
    >
      <h2
        id={`${id}-title`}
        className="sr-only md:not-sr-only md:mb-[22px] md:h-[30px] md:border-b md:border-copper/30 md:pb-[9px] md:text-lg md:leading-5 md:font-bold"
      >
        Resumo da carteira
      </h2>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (coupon.pending || loading) return
          const code = new FormData(event.currentTarget).get('code')
          if (typeof code === 'string') coupon.onApply(code)
        }}
      >
        <label
          htmlFor={`${id}-code`}
          className="sr-only text-sm leading-5 font-bold md:not-sr-only md:mb-1.5 md:block"
        >
          Código promocional
        </label>
        <div className="flex h-[50px] min-w-0 rounded-full border border-line md:h-10 md:rounded-[3px] md:border-copper">
          <Input
            id={`${id}-code`}
            name="code"
            autoComplete="off"
            maxLength={24}
            disabled={loading}
            placeholder={
              coupon.applied ? 'Substituir código promocional...' : 'Digite o código promocional...'
            }
            aria-invalid={Boolean(coupon.error)}
            aria-describedby={
              coupon.error
                ? `${id}-coupon-error`
                : coupon.applied
                  ? `${id}-coupon-applied`
                  : undefined
            }
            className="h-full flex-1 rounded-full border-0 px-[15px] text-13 md:rounded-none md:px-2 md:text-xs"
          />
          <Button
            type="submit"
            loading={coupon.pending}
            disabled={loading}
            className="-my-px -mr-px h-[50px] w-[97px] rounded-full bg-copper-gradient px-3 text-15 text-cream md:my-0 md:mr-0 md:h-full md:w-[102px] md:rounded-none md:rounded-r-[2px] md:bg-none md:text-ink"
          >
            Aplicar
          </Button>
        </div>
        {coupon.error && (
          <p id={`${id}-coupon-error`} role="alert" className="mt-2 text-xs text-coral">
            {coupon.error}
          </p>
        )}
        {coupon.applied && (
          <div
            id={`${id}-coupon-applied`}
            className="mt-2 flex flex-wrap items-center gap-2 text-xs text-sand"
          >
            <p>
              Cupom {coupon.applied.code} aplicado — {coupon.applied.description}
            </p>
            <Button
              variant="link"
              className="text-xs"
              disabled={coupon.pending}
              onClick={coupon.onRemove}
            >
              Remover
            </Button>
          </div>
        )}
      </form>
      {error && (
        <div role="alert" className="mt-3 space-y-2 text-sm text-coral">
          <p>{error}</p>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Tentar novamente
            </Button>
          )}
        </div>
      )}
      <div className={refreshing ? 'motion-safe:animate-pulse' : undefined}>
        <dl className="mt-3 space-y-3 text-15 leading-5 md:mt-6">
          <div className="flex flex-wrap items-center justify-between gap-x-2 md:h-5 md:items-baseline">
            <dt>Subtotal</dt>
            <dd className="text-base leading-5 md:text-lg md:leading-5">
              {amount(quote?.subtotal)}
            </dd>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-2">
            <dt>Desconto do lançamento</dt>
            <dd>{amount(quote?.discount, true)}</dd>
          </div>
          <div className="flex flex-wrap items-start justify-between gap-x-2">
            <dt>Taxa de rede</dt>
            <dd className="text-right text-base leading-5 md:text-lg md:leading-5">
              {amount(quote?.networkFee)}
              <span className="mt-0.5 block text-xs leading-3 text-amber md:mt-3 md:leading-4">
                Taxa estimada
              </span>
            </dd>
          </div>
        </dl>
        <dl className="mt-3 text-base leading-5 font-bold md:mt-[22px]">
          <div className="flex flex-wrap items-center justify-between gap-x-2">
            <dt>Total</dt>
            <dd className="text-lg leading-5 text-amber">{amount(quote?.total)}</dd>
          </div>
        </dl>
      </div>
      <Button
        asChild
        disabled={disabled}
        aria-describedby={checkoutDisabledReason ? `${id}-disabled` : undefined}
        className="mt-[30px] h-[60px] w-full rounded-[30px] bg-copper-gradient px-3 text-base whitespace-normal md:mt-[22px] md:h-10 md:rounded-[3px] md:bg-none md:text-15"
      >
        <SiteLink to={checkoutTo}>Conectar e finalizar</SiteLink>
      </Button>
      {checkoutDisabledReason && (
        <p id={`${id}-disabled`} className="mt-2 text-xs text-sand">
          {checkoutDisabledReason}
        </p>
      )}
      <SiteLink
        to={continueTo}
        className="mt-3 hidden text-center text-15 leading-5 text-amber hover:underline md:block"
      >
        Continuar explorando
      </SiteLink>
    </section>
  )
}

export { CartSummarySkeleton } from './cart-summary-skeleton'
