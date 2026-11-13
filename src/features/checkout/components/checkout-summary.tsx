import { useId, useState, type ReactNode } from 'react'

import { Artwork } from '@/components/artwork'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { type AppliedCoupon, type Quote, type QuoteItem } from '@/contracts'
import { formatEth, isZeroEth } from '@/lib/money'
import { cn } from '@/lib/utils'

export interface CheckoutSummaryProps {
  quote: Quote | undefined
  /** First load: skeletons with the final dimensions. */
  loading: boolean
  /** Background revalidation: values stay on screen. */
  refreshing?: boolean
  error?: string
  onRetry?: () => void
  /** Lines to draw while the quote loads (the cart is already known). */
  expectedItems?: number
  coupon: {
    applied: AppliedCoupon | null
    pending: boolean
    error?: string
    onApply: (code: string) => void
    onRemove: () => void
  }
  /** "Carteira e rede" options and the confirm button. */
  children?: ReactNode
  className?: string
}

function Line({ item }: { item: QuoteItem }) {
  return (
    <li className="flex min-h-[70px] items-center bg-surface pr-[17px] pl-1">
      <Artwork id={item.artwork} sizes="66px" alt="" className="w-[66px] shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1 pl-2">
        <p className="text-base leading-[21px] font-bold break-words">{item.name}</p>
        <p className="text-sm leading-[21px] text-khaki">
          ID do token: {item.tokenId}
          <span className="sr-only">, edição {item.editionLabel}</span>
        </p>
      </div>
      <p className="shrink-0 text-sm whitespace-nowrap text-sand">
        <span aria-hidden="true">(x {item.quantity})</span>
        <span className="sr-only">quantidade {item.quantity}</span>
      </p>
      <p className="shrink-0 pl-[7px] text-right text-lg leading-6 font-bold whitespace-nowrap text-amber">
        {formatEth(item.lineTotal)}
      </p>
    </li>
  )
}

/**
 * "Seus NFTs": the lines and totals of the quote the order will be created from.
 * Every amount comes from the API quote; nothing is computed here.
 */
export function CheckoutSummary({
  quote,
  loading,
  refreshing,
  error,
  onRetry,
  expectedItems = 3,
  coupon,
  children,
  className,
}: CheckoutSummaryProps) {
  const id = useId()
  const [couponOpen, setCouponOpen] = useState(false)
  const couponVisible = couponOpen || Boolean(coupon.error)

  const [code, setCode] = useState('')

  function applyCode() {
    const value = code.trim()
    if (value) coupon.onApply(value)
  }

  const amount = (value: string | undefined, className?: string) =>
    loading ? (
      <Skeleton className="h-5 w-[98px]" />
    ) : (
      <span className={className}>{value === undefined ? '—' : formatEth(value)}</span>
    )

  return (
    <section
      aria-labelledby={`${id}-title`}
      aria-busy={loading || refreshing || undefined}
      className={cn('min-w-0', className)}
    >
      <h2 id={`${id}-title`} className="text-17 leading-6 font-bold">
        Seus NFTs
      </h2>
      <div className="mt-1 flex items-baseline justify-between border-b border-hairline pb-[9px] text-base leading-6">
        <span className="font-bold">NFTs</span>
        <span className="font-medium">Subtotal</span>
      </div>

      {error ? (
        <div role="alert" className="mt-3 rounded-[3px] border border-coral p-4 text-sm">
          <p className="text-cream">Não foi possível calcular os valores do pedido.</p>
          <p className="mt-1 text-sand">{error}</p>
          {onRetry && (
            <Button size="sm" className="mt-3" onClick={onRetry}>
              Tentar novamente
            </Button>
          )}
        </div>
      ) : (
        <ul aria-label="Itens do pedido" className="mt-3 space-y-3">
          {quote
            ? quote.items.map((item) => <Line key={item.id} item={item} />)
            : Array.from({ length: expectedItems }, (_, index) => (
                <li key={index} aria-hidden="true">
                  <Skeleton className="h-[70px] w-full rounded-none" />
                </li>
              ))}
        </ul>
      )}

      <div className="mt-[14px] text-center text-sm leading-6">
        {coupon.applied ? (
          <p className="flex flex-wrap items-center justify-center gap-x-3">
            <span>
              Código <strong>{coupon.applied.code}</strong> aplicado
            </span>
            <button
              type="button"
              onClick={coupon.onRemove}
              disabled={coupon.pending}
              className="rounded-sm text-amber underline underline-offset-4 disabled:opacity-50"
            >
              Remover
            </button>
          </p>
        ) : (
          <button
            type="button"
            aria-expanded={couponVisible}
            aria-controls={`${id}-coupon`}
            onClick={() => setCouponOpen((open) => !open)}
            className="rounded-sm hover:text-amber"
          >
            Tem um código promocional?{' '}
            <span className="underline underline-offset-4">Aplique aqui</span>
          </button>
        )}
      </div>
      {!coupon.applied && (
        // Not a <form>: the summary lives inside the checkout form, and forms cannot
        // be nested. Enter in the field applies the code instead of submitting it.
        <div
          id={`${id}-coupon`}
          role="group"
          aria-label="Código promocional"
          hidden={!couponVisible}
          className="mt-2"
        >
          <div className="flex gap-2">
            <label htmlFor={`${id}-code`} className="sr-only">
              Código promocional
            </label>
            <Input
              id={`${id}-code`}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return
                event.preventDefault()
                applyCode()
              }}
              placeholder="Digite o código promocional..."
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              enterKeyHint="done"
              maxLength={24}
              aria-invalid={coupon.error ? true : undefined}
              aria-describedby={coupon.error ? `${id}-code-error` : undefined}
              className="rounded-[3px]"
            />
            <Button onClick={applyCode} loading={coupon.pending} className="rounded-[3px] px-4">
              Aplicar
            </Button>
          </div>
          {coupon.error && (
            <p id={`${id}-code-error`} role="alert" className="mt-1 text-left text-sm text-coral">
              {coupon.error}
            </p>
          )}
        </div>
      )}

      <dl className="mt-[6px] text-15 leading-8">
        <div className="flex items-center justify-between gap-3">
          <dt>Subtotal</dt>
          <dd className="text-lg">{amount(quote?.subtotal)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt>Desconto do lançamento</dt>
          <dd>
            {loading ? (
              <Skeleton className="h-5 w-[82px]" />
            ) : quote && !isZeroEth(quote.discount) ? (
              `(-) ${formatEth(quote.discount)}`
            ) : (
              '(-) 00.00'
            )}
          </dd>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-3">
          <dt>Taxa de rede</dt>
          <dd className="text-lg">{amount(quote?.networkFee)}</dd>
          <dd className="basis-full text-center text-xs leading-6 text-amber">Taxa estimada</dd>
        </div>
        <div className="mt-[3px] flex items-center justify-between gap-3 border-t border-hairline px-[42px] pt-[10px] text-base font-bold">
          <dt>Total</dt>
          <dd className="text-lg text-amber" data-testid="checkout-total">
            {amount(quote?.total)}
          </dd>
        </div>
      </dl>

      {children}
    </section>
  )
}
