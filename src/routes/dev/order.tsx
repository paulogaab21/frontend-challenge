import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { SiteLink } from '@/components/layout/site-link'
import type { Order, OrderItem, SimulatedTransaction } from '@/contracts'
import { OrderDeclined } from '@/features/orders/components/order-declined'
import { OrderPending } from '@/features/orders/components/order-pending'
import { OrderReceipt } from '@/features/orders/components/order-receipt'
import { OrderSkeleton } from '@/features/orders/components/order-skeleton'
import { OrderUnavailable } from '@/features/orders/components/order-unavailable'
import { OrdersList, OrdersListSkeleton } from '@/features/orders/components/orders-list'
import {
  TransactionDetails,
  TransactionDetailsSkeleton,
} from '@/features/orders/components/transaction-details'
import { createNftFixtures, NFT_IDS } from '@/mocks/fixtures/nfts'
import { createWalletFixtures } from '@/mocks/fixtures/users'

export const Route = createFileRoute('/dev/order')({ component: OrderShowcase })

const catalog = createNftFixtures()
const items: OrderItem[] = (
  [
    [NFT_IDS.emeraldApe, 2, '2.38'],
    [NFT_IDS.violetNomad, 6, '8.34'],
    [NFT_IDS.ivoryBaron, 9, '16.11'],
  ] satisfies Array<[string, number, string]>
).map(([nftId, quantity, lineTotal]) => {
  const nft = catalog.find((entry) => entry.id === nftId)!
  const edition = nft.editions.find((entry) => entry.id === 'fifty')!
  return {
    nftId,
    editionId: edition.id,
    editionLabel: edition.label,
    name: nft.name,
    tokenId: nft.tokenId,
    artwork: nft.artwork,
    unitPrice: edition.price,
    quantity,
    lineTotal,
  }
})
const wallet = createWalletFixtures()[0]!
const order: Order = {
  id: 'ord_1001',
  status: 'confirmed',
  declineReason: null,
  statusMessage: null,
  items,
  coupon: null,
  subtotal: '26.83',
  discount: '0',
  networkFee: '0.016',
  total: '26.846',
  network: 'ethereum',
  wallet: { id: wallet.id, provider: wallet.provider, address: wallet.address, label: 'MetaMask' },
  collector: {
    displayName: wallet.displayName,
    username: 'ana.souza',
    email: wallet.email,
    profileName: wallet.profileName,
    ens: `${wallet.ensName}${wallet.ensSuffix}`,
    referralCode: wallet.referralCode,
    secondaryAddress: wallet.secondaryAddress,
    note: null,
  },
  transaction: {
    hash: '0xa91f3c5d7e9b1a2c4d6e8f0a1b3c5d7e9f1ae82ca91f3c5d7e9b1a2c4d6ee82c',
    explorerName: 'Etherscan',
    explorerUrl: '/transacao/showcase',
  },
  createdAt: '2026-07-29T15:00:00.000Z',
  updatedAt: '2026-07-29T15:00:03.000Z',
  settledAt: '2026-07-29T15:00:03.000Z',
  version: 2,
}
const pending: Order = {
  ...order,
  id: 'ord_1002',
  status: 'pending',
  transaction: null,
  settledAt: null,
  version: 1,
}
const declined: Order = {
  ...order,
  id: 'ord_1003',
  status: 'declined',
  declineReason: 'wallet_rejected',
  statusMessage: 'O pagamento foi recusado pela carteira. Nenhum valor foi debitado.',
  transaction: null,
}
const transaction: SimulatedTransaction = {
  hash: order.transaction!.hash,
  orderId: order.id,
  network: order.network,
  explorerName: order.transaction!.explorerName,
  from: wallet.address,
  to: '0x7A420B1E55ED5EA1ED0FACADE0DEC0DE0BA519E8',
  value: '26.83',
  fee: '0.016',
  block: 19001001,
  confirmedAt: order.settledAt!,
}

function OrderShowcase() {
  const [action, setAction] = useState('Nenhuma ação solicitada.')
  return (
    <main className="pb-16">
      <div data-showcase="order-confirmed">
        <OrderReceipt order={order} closeTo="/" explorerTo="#explorador" />
      </div>
      <div className="container-page mt-16">
        <p role="status" className="text-sand">
          {action}
        </p>
        <SiteLink to="/dev/cart" className="text-amber hover:underline">
          Ver demonstração do carrinho
        </SiteLink>
      </div>
      <div data-showcase="order-discount">
        <OrderReceipt
          order={{
            ...order,
            id: 'ord_1004',
            coupon: { code: 'KURIO10', description: '10% de desconto do lançamento' },
            discount: '2.683',
            total: '24.163',
          }}
          closeTo="/"
          explorerTo="#explorador"
        />
      </div>
      <div data-showcase="order-pending">
        <OrderPending
          order={pending}
          closeTo="/"
          realtime="connected"
          refreshing={false}
          onRefresh={() => setAction('Atualização de status solicitada.')}
        />
      </div>
      <div data-showcase="order-reconnecting">
        <OrderPending
          order={pending}
          closeTo="/"
          realtime="reconnecting"
          refreshing
          onRefresh={() => setAction('Atualização de status solicitada.')}
        />
      </div>
      <div data-showcase="order-declined">
        <OrderDeclined order={declined} closeTo="/" retryTo="/pagamento" cartTo="/carrinho" />
      </div>
      <div data-showcase="order-not-found">
        <OrderUnavailable kind="not-found" closeTo="/" />
      </div>
      <div data-showcase="order-forbidden">
        <OrderUnavailable kind="forbidden" closeTo="/" />
      </div>
      <div data-showcase="order-error">
        <OrderUnavailable
          kind="error"
          closeTo="/"
          onRetry={() => setAction('Nova consulta do pedido solicitada.')}
        />
      </div>
      <div data-showcase="order-skeleton">
        <OrderSkeleton closeTo="/" />
      </div>
      <section className="container-page mt-16 space-y-8">
        <h2 className="text-2xl font-bold">Atividade do colecionador</h2>
        <div data-showcase="orders-list">
          <OrdersList
            orders={[pending, order, declined]}
            getHref={(entry) => `/pedido/${entry.id}`}
            exploreTo="/"
          />
        </div>
        <div data-showcase="orders-empty">
          <OrdersList orders={[]} getHref={(entry) => `/pedido/${entry.id}`} exploreTo="/" />
        </div>
        <div data-showcase="orders-loading">
          <OrdersListSkeleton />
        </div>
      </section>
      <section id="explorador" className="container-page mt-16 space-y-8">
        <div data-showcase="transaction">
          <TransactionDetails transaction={transaction} orderTo={`/pedido/${order.id}`} />
        </div>
        <div data-showcase="transaction-loading">
          <TransactionDetailsSkeleton />
        </div>
      </section>
    </main>
  )
}
