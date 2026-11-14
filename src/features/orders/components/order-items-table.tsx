import { Artwork } from '@/components/artwork'
import type { Order } from '@/contracts'
import { formatEth, isZeroEth } from '@/lib/money'

export interface OrderItemsTableProps {
  order: Order
}

export function OrderItemsTable({ order }: OrderItemsTableProps) {
  return (
    <div className="min-w-0">
      <table
        aria-label="Itens da transação"
        className="-my-3 w-full table-fixed border-separate border-spacing-x-0 border-spacing-y-3 text-left"
      >
        <colgroup>
          <col className="w-[54%] md:w-[60.6%]" />
          <col className="w-[18%] md:w-[16%]" />
          <col className="w-[28%] md:w-[23.4%]" />
        </colgroup>
        <thead>
          <tr className="text-xs md:text-base">
            <th scope="col" className="border-b border-copper/30 pb-[7px] leading-5 font-bold">
              NFTs
            </th>
            <th scope="col" className="border-b border-copper/30 pb-[7px] leading-5 font-bold">
              Edições
            </th>
            <th
              scope="col"
              className="border-b border-copper/30 pb-[7px] text-right leading-5 font-medium"
            >
              Subtotal
            </th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={`${item.nftId}:${item.editionId}`} className="h-[70px] align-middle">
              <td className="p-0 pr-2">
                <div className="flex min-h-[70px] flex-col gap-2 md:flex-row md:items-center md:gap-3">
                  <Artwork
                    id={item.artwork}
                    sizes="70px"
                    className="w-[min(70px,100%)] shrink-0 rounded-lg"
                  />
                  <div className="min-w-0">
                    <p className="text-xs leading-5 font-bold break-words md:text-base">
                      {item.name}
                    </p>
                    <p className="mt-1 text-10 leading-5 break-words text-khaki md:text-sm">
                      ID do token: {item.tokenId}
                    </p>
                  </div>
                </div>
              </td>
              <td className="p-0 pr-1 text-xs text-sand md:text-sm">
                <span aria-label={`${item.quantity} edições, edição ${item.editionLabel}`}>
                  (x {item.quantity})
                </span>
              </td>
              <td className="p-0 text-right text-xs leading-6 font-bold break-words text-amber md:text-lg">
                {formatEth(item.lineTotal)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="mt-3 space-y-[10px] text-sm leading-5 md:ml-[169px] md:text-15">
        {!isZeroEth(order.discount) && (
          <div className="flex justify-between gap-x-2">
            <dt className="min-w-0">
              Desconto
              {order.coupon && <span className="text-sand"> ({order.coupon.code})</span>}
            </dt>
            <dd className="shrink-0 text-right whitespace-nowrap">
              (-) {formatEth(order.discount)}
            </dd>
          </div>
        )}
        <div className="flex flex-wrap justify-between gap-x-2">
          <dt>Taxa de rede</dt>
          <dd className="text-base leading-5 md:text-lg md:leading-5">
            {formatEth(order.networkFee)}
          </dd>
        </div>
        <div className="flex flex-wrap justify-between gap-x-2 text-base leading-5 font-bold">
          <dt>Total</dt>
          <dd className="text-lg leading-5 text-amber">{formatEth(order.total)}</dd>
        </div>
      </dl>
    </div>
  )
}
