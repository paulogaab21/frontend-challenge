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
    <li aria-busy={pending || undefined} className="relative min-w-0">
      <div className="relative grid min-h-[100px] grid-cols-[100px_minmax(0,1fr)] gap-x-[9px] rounded-[14px] bg-surface shadow-lg max-[360px]:grid-cols-1">
        <SiteLink
          to={href}
          className={`self-start rounded-[14px] ${soldOut ? 'opacity-40' : ''}`}
          aria-label={`Ver ${item.name}`}
        >
          <Artwork id={item.artwork} sizes="100px" alt="" className="w-[100px] rounded-[14px]" />
        </SiteLink>
        <div className="min-w-0 pt-[11px] pr-3 pb-[9px] max-[360px]:px-3">
          <SiteLink
            to={href}
            className="block text-15 leading-5 font-bold break-words hover:text-amber"
          >
            {item.name}
          </SiteLink>
          <p className="mt-[1.5px] text-sm leading-[22px] text-sand">Edição: {item.editionLabel}</p>
          {soldOut && <span className="text-xs font-bold text-coral">Esgotado</span>}
          <p className="mt-3 text-lg leading-[22px] font-bold text-amber">
            {formatEth(item.lineTotal)}
          </p>
          <div className="absolute top-[38.5px] right-4 max-[360px]:static max-[360px]:mt-3">
            <QuantityStepper
              name={item.name}
              quantity={item.quantity}
              maxQuantity={item.maxQuantity}
              disabled={soldOut}
              onChange={(quantity) => onQuantityChange(item, quantity)}
            />
            {!soldOut && item.quantity >= item.maxQuantity && (
              <p className="absolute top-full right-0 mt-0.5 w-max text-10 leading-3 text-sand">
                Máximo disponível
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onRemove(item)}
          aria-label={`Remover ${item.name} do carrinho`}
          title={`Remover ${item.name} do carrinho`}
          className="absolute top-0.5 right-0.5 flex size-6 items-center justify-center rounded-sm text-copper hover:text-amber"
        >
          <TrashIcon size={20} />
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
