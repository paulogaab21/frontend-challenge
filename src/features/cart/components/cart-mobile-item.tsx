import { Artwork } from '@/components/artwork'
import { TrashIcon } from '@/components/icons'
import { SiteLink } from '@/components/layout/site-link'
import type { CartItem, QuoteIssue } from '@/contracts'
import { formatEth } from '@/lib/money'

import { CartItemFeedback } from './cart-item-feedback'
import { QuantityStepper } from './quantity-stepper'

export interface CartMobileItemProps {
  item: CartItem
  href: string
  pending?: boolean
  error?: string
  blocker?: QuoteIssue
  onQuantityChange: (item: CartItem, quantity: number) => void
  onRemove: (item: CartItem) => void
}

export function CartMobileItem({
  item,
  href,
  pending,
  error,
  blocker,
  onQuantityChange,
  onRemove,
}: CartMobileItemProps) {
  const soldOut = item.available === 0
  return (
    <li aria-busy={pending || undefined} className="min-w-0 space-y-2">
      <div className="grid min-h-[100px] grid-cols-[100px_minmax(0,1fr)] gap-x-[9px] overflow-hidden rounded-[14px] bg-surface shadow-lg">
        <SiteLink
          to={href}
          className={soldOut ? 'self-start opacity-40' : 'self-start'}
          aria-label={`Ver ${item.name}`}
        >
          <Artwork id={item.artwork} sizes="100px" alt="" className="w-[100px] rounded-[14px]" />
        </SiteLink>
        <div className="min-w-0 py-[10px] pr-3">
          <SiteLink
            to={href}
            className="block text-15 leading-5 font-bold break-words hover:text-amber"
          >
            {item.name}
          </SiteLink>
          <p className="text-sm leading-[22px] text-sand">Edição: {item.editionLabel}</p>
          {soldOut && <span className="text-xs font-bold text-coral">Esgotado</span>}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-lg leading-[22px] font-bold text-amber">
              {formatEth(item.lineTotal)}
            </p>
            <QuantityStepper
              name={item.name}
              quantity={item.quantity}
              maxQuantity={item.maxQuantity}
              disabled={soldOut}
              onChange={(quantity) => onQuantityChange(item, quantity)}
            />
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <span className="text-xs text-sand">
          {!soldOut && item.quantity >= item.maxQuantity ? 'Máximo disponível' : ''}
        </span>
        <button
          type="button"
          onClick={() => onRemove(item)}
          aria-label={`Remover ${item.name} do carrinho`}
          className="inline-flex min-h-8 items-center gap-2 text-xs text-sand hover:text-amber"
        >
          <TrashIcon size={18} />
          Remover
        </button>
      </div>
      <CartItemFeedback
        item={item}
        error={error}
        blocker={blocker}
        onQuantityChange={onQuantityChange}
      />
    </li>
  )
}
