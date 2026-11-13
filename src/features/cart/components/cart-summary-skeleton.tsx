import { CartSummary } from './cart-summary'

export type CartSummarySkeletonProps = Record<string, never>

export function CartSummarySkeleton() {
  return (
    <CartSummary
      quote={undefined}
      loading
      coupon={{
        applied: null,
        pending: false,
        onApply: () => undefined,
        onRemove: () => undefined,
      }}
      checkoutTo="#"
      continueTo="#"
    />
  )
}
