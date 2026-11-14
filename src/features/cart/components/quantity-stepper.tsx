import { MinusIcon, PlusIcon } from '@/components/icons'

export interface QuantityStepperProps {
  name: string
  quantity: number
  maxQuantity: number
  disabled?: boolean
  onChange: (quantity: number) => void
}

export function QuantityStepper({
  name,
  quantity,
  maxQuantity,
  disabled,
  onChange,
}: QuantityStepperProps) {
  return (
    <div className="inline-flex items-center gap-[11px] text-base md:gap-3 md:text-17">
      <button
        type="button"
        disabled={disabled || quantity <= 1}
        onClick={() => onChange(quantity - 1)}
        aria-label={`Diminuir quantidade de ${name}`}
        className="flex h-6 w-6 items-center justify-center rounded-full border border-line bg-surface-raised text-cream disabled:text-line-strong md:h-[30px] md:w-5 md:rounded-[10px] md:border-ink md:bg-copper md:text-ink md:disabled:opacity-50"
      >
        <MinusIcon size={12} />
      </button>
      <span
        aria-live="polite"
        aria-atomic="true"
        className="min-w-[11px] text-center md:min-w-[11px]"
      >
        <span className="sr-only">Quantidade de {name}: </span>
        {quantity}
      </span>
      <button
        type="button"
        disabled={disabled || quantity >= maxQuantity}
        onClick={() => onChange(quantity + 1)}
        aria-label={`Aumentar quantidade de ${name}`}
        className="flex h-6 w-6 items-center justify-center rounded-full border border-line bg-surface-raised text-cream disabled:text-line-strong md:h-[30px] md:w-5 md:rounded-[10px] md:border-ink md:bg-copper md:text-ink md:disabled:opacity-50"
      >
        <PlusIcon size={12} />
      </button>
    </div>
  )
}
