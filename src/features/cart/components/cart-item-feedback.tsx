import { Button } from '@/components/ui/button'
import type { CartItem, QuoteIssue } from '@/contracts'

export interface CartItemFeedbackProps {
  item: CartItem
  error?: string
  blocker?: QuoteIssue
  onQuantityChange: (item: CartItem, quantity: number) => void
}

export function CartItemFeedback({
  item,
  error,
  blocker,
  onQuantityChange,
}: CartItemFeedbackProps) {
  const soldOut = item.available === 0
  const overLimit = !soldOut && item.quantity > item.maxQuantity
  if (!error && !blocker && !soldOut && !overLimit) return null
  return (
    <div className="space-y-1 text-xs text-coral">
      {error && <p role="alert">{error}</p>}
      {soldOut ? (
        <p>{blocker?.message ?? 'Esta edição esgotou. Remova o item para continuar.'}</p>
      ) : overLimit ? (
        <>
          <p>Restam apenas {item.maxQuantity} unidades.</p>
          {item.maxQuantity > 0 && (
            <Button
              variant="link"
              className="text-xs"
              onClick={() => onQuantityChange(item, item.maxQuantity)}
            >
              Ajustar para {item.maxQuantity}
            </Button>
          )}
          {blocker && <p>{blocker.message}</p>}
        </>
      ) : (
        blocker && <p>{blocker.message}</p>
      )}
    </div>
  )
}
