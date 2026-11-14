import { useId } from 'react'
import { MinusIcon, PlusIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
export interface QuantityStepperProps {
  quantity: number
  maxQuantity: number
  available: number
  onQuantityChange: (quantity: number) => void
  disabled?: boolean
  compact?: boolean
}
export function QuantityStepper({
  quantity,
  maxQuantity,
  available,
  onQuantityChange,
  disabled,
  compact,
}: QuantityStepperProps) {
  const id = useId()
  const max = Math.min(maxQuantity, available)
  const lowStock = available <= maxQuantity
  // The limit is always described to assistive technology; on screen it shows up
  // when it matters: little stock left, or the limit has been reached.
  const hintVisible = lowStock || quantity >= max
  return (
    <div className="relative">
      <div
        role="group"
        aria-label="Quantidade"
        aria-describedby={id}
        className={cn('flex items-center gap-3', compact && 'gap-2')}
      >
        <Button
          size="icon"
          className={cn(
            'h-[50px] w-[33px] rounded-full border border-ink p-0',
            compact && 'h-[30px] w-5',
          )}
          disabled={disabled || quantity <= 1}
          onClick={() => onQuantityChange(quantity - 1)}
          aria-label="Diminuir quantidade"
        >
          <MinusIcon size={compact ? 13 : 22} />
        </Button>
        <output
          aria-live="polite"
          aria-atomic="true"
          className={cn(
            'min-w-[13px] text-center text-xl',
            compact && 'min-w-4 text-lg font-medium',
          )}
        >
          {quantity}
        </output>
        <Button
          size="icon"
          className={cn(
            'h-[50px] w-[33px] rounded-full border border-ink p-0',
            compact && 'h-[30px] w-5',
          )}
          disabled={disabled || quantity >= max}
          onClick={() => onQuantityChange(quantity + 1)}
          aria-label="Aumentar quantidade"
        >
          <PlusIcon size={compact ? 13 : 22} />
        </Button>
      </div>
      <p
        id={id}
        className={cn(
          'absolute top-full left-0 mt-0.5 w-max text-2xs leading-3 text-sand',
          !hintVisible && 'sr-only',
        )}
      >
        {lowStock ? `Restam ${available}` : `Máximo de ${maxQuantity} por pedido`}
      </p>
    </div>
  )
}
