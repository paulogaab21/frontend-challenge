import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { PageShell } from '@/components/layout/page-shell'
import { SiteLink } from '@/components/layout/site-link'
import { Button } from '@/components/ui/button'
import type { CartItem, Quote, QuoteIssue } from '@/contracts'
import { CartEmpty } from '@/features/cart/components/cart-empty'
import { CartError } from '@/features/cart/components/cart-error'
import { CartItems, CartItemsSkeleton } from '@/features/cart/components/cart-items'
import { CartLayout } from '@/features/cart/components/cart-layout'
import { CartNotices } from '@/features/cart/components/cart-notices'
import { CartSummary, CartSummarySkeleton } from '@/features/cart/components/cart-summary'
import { createNftFixtures, NFT_IDS } from '@/mocks/fixtures/nfts'

export const Route = createFileRoute('/dev/cart')({ component: CartShowcase })

const catalog = createNftFixtures()
const sampleItems: CartItem[] = (
  [
    [NFT_IDS.emeraldApe, 2, '2.38'],
    [NFT_IDS.violetNomad, 6, '8.34'],
    [NFT_IDS.ivoryBaron, 9, '16.11'],
  ] satisfies Array<[string, number, string]>
).map(([id, quantity, lineTotal]) => {
  const nft = catalog.find((entry) => entry.id === id)!
  const edition = nft.editions.find((entry) => entry.id === 'fifty')!
  return {
    id: `${nft.id}:fifty`,
    nftId: nft.id,
    editionId: 'fifty',
    editionLabel: edition.label,
    name: nft.name,
    tokenId: nft.tokenId,
    artwork: nft.artwork,
    network: nft.network,
    unitPrice: edition.price,
    quantity: quantity as number,
    lineTotal: lineTotal as string,
    available: edition.available,
    maxQuantity: 10,
    nftVersion: nft.version,
  }
})
const quote: Quote = {
  id: 'showcase-quote',
  fingerprint: 'showcase',
  network: 'ethereum',
  items: sampleItems,
  coupon: null,
  subtotal: '26.83',
  discount: '0',
  networkFee: '0.016',
  total: '26.846',
  purchasable: true,
  issues: [],
  createdAt: '2026-07-29T15:00:00.000Z',
  expiresAt: '2026-07-29T15:05:00.000Z',
}
const changes: QuoteIssue[] = [
  {
    type: 'price_changed',
    blocking: false,
    itemId: sampleItems[0]!.id,
    nftId: NFT_IDS.emeraldApe,
    message: 'O preço de Emerald Ape #042 mudou.',
    previous: '1.19',
    current: '1.29',
  },
]
const blockers: QuoteIssue[] = [
  {
    type: 'edition_unavailable',
    blocking: true,
    itemId: sampleItems[1]!.id,
    message: 'Esta edição de Violet Nomad #314 esgotou. Remova o item para continuar.',
  },
]

function CartShowcase() {
  const [lastAction, setLastAction] = useState('Nenhuma ação solicitada.')
  const action = (text: string) => setLastAction(text)
  const coupon = {
    applied: null,
    pending: false,
    onApply: (code: string) => action(`Aplicar cupom: ${code}`),
    onRemove: () => action('Remover cupom'),
  }
  const itemProps = {
    getHref: (item: CartItem) => `/nft/${item.nftId}`,
    onQuantityChange: (item: CartItem, quantity: number) =>
      action(`Quantidade solicitada: ${item.name} → ${quantity}`),
    onRemove: (item: CartItem) => action(`Remover: ${item.name}`),
  }
  const summaryProps = { quote, loading: false, coupon, checkoutTo: '/pagamento', continueTo: '/' }
  return (
    <PageShell
      footer={false}
      mobileTabBar={false}
      header={{ activeNav: 'mercado' }}
      mobileTopBar={{ variant: 'inner', title: 'Carrinho de NFTs', backTo: '/' }}
      mainClassName="md:pt-8"
    >
      <h1 className="sr-only">Carrinho de NFTs — demonstração dos componentes</h1>
      <nav
        aria-label="Navegação estrutural"
        className="container-page mb-2 hidden text-15 leading-5 font-bold md:block"
      >
        <SiteLink to="/">Início</SiteLink> / <SiteLink to="/">Mercado</SiteLink> / Carrinho
      </nav>
      <div data-showcase="cart-default">
        <CartLayout
          items={<CartItems items={sampleItems} {...itemProps} />}
          summary={<CartSummary {...summaryProps} />}
        />
      </div>
      <div className="container-page mt-16 space-y-10 pb-16">
        <p role="status" className="rounded-lg border border-line p-4 text-sm text-sand">
          {lastAction}
        </p>
        <section data-showcase="cart-stock">
          <h2 className="mb-4 text-xl font-bold">Disponibilidade e atualização</h2>
          <CartLayout
            notices={
              <CartNotices
                changes={changes}
                blockers={blockers}
                onAccept={() => action('Alterações reconhecidas')}
              />
            }
            items={
              <CartItems
                {...itemProps}
                items={sampleItems.map((item, index) => ({
                  ...item,
                  available: index === 1 ? 0 : item.available,
                  maxQuantity: index === 0 ? item.quantity : index === 1 ? 0 : 3,
                }))}
                blockers={blockers}
                pendingItemIds={new Set([sampleItems[0]!.id])}
                itemErrors={{ [sampleItems[2]!.id]: 'O estoque mudou durante sua compra.' }}
              />
            }
            summary={
              <CartSummary
                {...summaryProps}
                checkoutDisabledReason="Resolva os itens indisponíveis para continuar."
                refreshing
              />
            }
          />
        </section>
        <section data-showcase="cart-loading">
          <h2 className="mb-4 text-xl font-bold">Carregando carrinho e cotação</h2>
          <CartLayout items={<CartItemsSkeleton rows={3} />} summary={<CartSummarySkeleton />} />
        </section>
        <section>
          <h2 className="mb-4 text-xl font-bold">Carrinho vazio</h2>
          <CartEmpty to="/" />
        </section>
        <section>
          <h2 className="mb-4 text-xl font-bold">Falha no carrinho</h2>
          <CartError
            message="O serviço está indisponível no momento."
            onRetry={() => action('Recarregar carrinho')}
          />
        </section>
        <section className="grid min-w-0 gap-8 md:grid-cols-2 xl:grid-cols-3">
          <div data-showcase="coupon-applied">
            <h2 className="mb-4 text-xl font-bold">Cupom aplicado</h2>
            <CartSummary
              {...summaryProps}
              quote={{ ...quote, discount: '2.683', total: '24.163' }}
              coupon={{
                ...coupon,
                applied: { code: 'KURIO10', description: '10% de desconto do lançamento' },
              }}
            />
          </div>
          <div data-showcase="coupon-error">
            <h2 className="mb-4 text-xl font-bold">Cupom inválido</h2>
            <CartSummary
              {...summaryProps}
              coupon={{ ...coupon, error: 'Código promocional inválido.' }}
            />
          </div>
          <div>
            <h2 className="mb-4 text-xl font-bold">Aplicando cupom</h2>
            <CartSummary {...summaryProps} coupon={{ ...coupon, pending: true }} />
          </div>
          <div>
            <h2 className="mb-4 text-xl font-bold">Falha na cotação</h2>
            <CartSummary
              {...summaryProps}
              quote={undefined}
              error="Não foi possível carregar a cotação."
              onRetry={() => action('Recarregar cotação')}
            />
          </div>
        </section>
        <Button variant="link" asChild>
          <SiteLink to="/dev/order">Ver demonstração dos pedidos</SiteLink>
        </Button>
      </div>
    </PageShell>
  )
}
