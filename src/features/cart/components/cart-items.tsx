import { Artwork } from '@/components/artwork'
import { TrashIcon } from '@/components/icons'
import { SiteLink } from '@/components/layout/site-link'
import type { CartItem, QuoteIssue } from '@/contracts'
import { formatEth } from '@/lib/money'
import { cn } from '@/lib/utils'

import { CartItemFeedback } from './cart-item-feedback'
import { CartMobileItem } from './cart-mobile-item'
import { QuantityStepper } from './quantity-stepper'

export interface CartItemsProps {
  items: CartItem[]
  getHref: (item: CartItem) => string
  onQuantityChange: (item: CartItem, quantity: number) => void
  onRemove: (item: CartItem) => void
  pendingItemIds?: ReadonlySet<string>
  itemErrors?: Readonly<Record<string, string>>
  blockers?: QuoteIssue[]
}

export function CartItems({
  items,
  getHref,
  onQuantityChange,
  onRemove,
  pendingItemIds,
  itemErrors,
  blockers = [],
}: CartItemsProps) {
  return (
    <div className="min-w-0">
      <ul aria-label="NFTs no carrinho" className="space-y-5 md:hidden">
        {items.map((item) => (
          <CartMobileItem
            key={item.id}
            item={item}
            href={getHref(item)}
            pending={pendingItemIds?.has(item.id)}
            error={itemErrors?.[item.id]}
            blocker={blockers.find((issue) => issue.itemId === item.id)}
            onQuantityChange={onQuantityChange}
            onRemove={onRemove}
          />
        ))}
      </ul>
      <div className="flow-root hidden md:block">
        <table
          aria-label="NFTs no carrinho"
          className="-my-3 w-full table-fixed border-separate border-spacing-x-0 border-spacing-y-3 text-left text-base"
        >
          <colgroup>
            <col className="w-[39.8%]" />
            <col className="w-[17.7%]" />
            <col className="w-[17.45%]" />
            <col className="w-[16.05%]" />
            <col className="w-[9%]" />
          </colgroup>
          <thead>
            <tr>
              {/* Weights as drawn: "NFTs" and "Edições" bold, "Preço" and "Total" medium. */}
              {['NFTs', 'Preço', 'Edições', 'Total'].map((label, index) => (
                <th
                  key={label}
                  scope="col"
                  className={cn(
                    'border-b border-copper/30 pb-[9px] leading-5',
                    index % 2 === 0 ? 'font-bold' : 'font-medium',
                  )}
                >
                  {label}
                </th>
              ))}
              <th scope="col" className="border-b border-copper/30 pb-[9px]">
                <span className="sr-only">Remover</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const soldOut = item.available === 0
              const blocker = blockers.find((issue) => issue.itemId === item.id)
              const error = itemErrors?.[item.id]
              return (
                <tr
                  key={item.id}
                  aria-busy={pendingItemIds?.has(item.id) || undefined}
                  className="h-[70px] bg-surface align-middle"
                >
                  <td className="p-0">
                    <div className="flex min-h-[70px] items-center gap-4">
                      <SiteLink
                        to={getHref(item)}
                        aria-label={`Ver ${item.name}`}
                        className={soldOut ? 'shrink-0 opacity-40' : 'shrink-0'}
                      >
                        <Artwork
                          id={item.artwork}
                          sizes="70px"
                          alt=""
                          className="w-[70px] rounded-md"
                        />
                      </SiteLink>
                      <div className="min-w-0 py-1.5 pr-2">
                        <SiteLink
                          to={getHref(item)}
                          className="block text-base leading-5 font-bold break-words hover:text-amber"
                        >
                          {item.name}
                        </SiteLink>
                        <p className="mt-0.5 text-sm leading-5 text-khaki">
                          ID do token: {item.tokenId}
                        </p>
                        {soldOut && <span className="text-xs font-bold text-coral">Esgotado</span>}
                        <CartItemFeedback
                          item={item}
                          error={error}
                          blocker={blocker}
                          onQuantityChange={onQuantityChange}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="p-0 pr-2 font-bold break-words text-sand">
                    {formatEth(item.unitPrice)}
                  </td>
                  <td className="p-0 pr-2">
                    {/* The stepper stays centred in the row, as drawn; the edition (and
                        the stock limit) hang below it without moving it. */}
                    <div className="relative w-fit">
                      <QuantityStepper
                        name={item.name}
                        quantity={item.quantity}
                        maxQuantity={item.maxQuantity}
                        disabled={soldOut}
                        onChange={(quantity) => onQuantityChange(item, quantity)}
                      />
                      {!soldOut && item.quantity >= item.maxQuantity && (
                        <p className="absolute bottom-full left-0 mb-0.5 w-max text-10 leading-3 text-sand">
                          Máximo disponível
                        </p>
                      )}
                      <p className="absolute top-full left-0 mt-0.5 w-max text-10 leading-3 text-sand">
                        Edição {item.editionLabel}
                      </p>
                    </div>
                  </td>
                  <td className="p-0 pr-2 font-bold break-words text-amber">
                    {formatEth(item.lineTotal)}
                  </td>
                  <td className="p-0 text-center">
                    <button
                      type="button"
                      onClick={() => onRemove(item)}
                      aria-label={`Remover ${item.name} do carrinho`}
                      className="inline-flex size-10 items-center justify-center text-khaki hover:text-amber"
                    >
                      <TrashIcon size={24} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export { CartItemsSkeleton } from './cart-items-skeleton'
