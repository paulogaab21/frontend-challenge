import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { AppShell } from '@/app/app-shell'
import { SiteLink } from '@/components/layout/site-link'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import type { CartItem, NftSummary } from '@/contracts'
import { NftCarousel } from '@/features/catalog/components/nft-carousel'
import { NftCarouselSkeleton } from '@/features/catalog/components/nft-carousel-skeleton'
import { nftListQueryOptions } from '@/features/catalog/queries'
import { errorMessage, isApiError } from '@/lib/http'
import { notify } from '@/lib/notify'
import { useDocumentTitle } from '@/lib/use-document-title'

import { CartEmpty } from './components/cart-empty'
import { CartError } from './components/cart-error'
import { CartItems } from './components/cart-items'
import { CartItemsSkeleton } from './components/cart-items-skeleton'
import { CartLayout } from './components/cart-layout'
import { CartNotices } from './components/cart-notices'
import { CartSummary } from './components/cart-summary'
import {
  useApplyCoupon,
  useCart,
  usePendingCartItems,
  useQuote,
  useRemoveCartItem,
  useRemoveCoupon,
  useUpdateCartItem,
} from './queries'
import { useQuoteReview } from './use-quote-review'

/** The cart is priced for the default settlement network; checkout lets it change. */
const CART_NETWORK = 'ethereum'

const nftHref = (nft: NftSummary) => `/nft/${nft.id}`
const itemHref = (item: CartItem) => `/nft/${item.nftId}?edicao=${item.editionId}`

/** Other NFTs to keep exploring, served by the catalog API. */
function AlsoViewed({ exclude }: { exclude: ReadonlySet<string> }) {
  const trending = useQuery(nftListQueryOptions({ tab: 'em-alta', pageSize: 12 }))
  if (trending.isPending) return <NftCarouselSkeleton />
  const items = trending.data?.items.filter((nft) => !exclude.has(nft.id)) ?? []
  if (items.length === 0) return null
  return <NftCarousel title="Colecionadores também viram" items={items} getHref={nftHref} />
}

export function CartPage() {
  useDocumentTitle('Carrinho de NFTs')
  const cart = useCart()
  const quote = useQuote(CART_NETWORK)
  const review = useQuoteReview()
  const pendingItems = usePendingCartItems()
  const updateItem = useUpdateCartItem()
  const removeItem = useRemoveCartItem()
  const applyCoupon = useApplyCoupon()
  const removeCoupon = useRemoveCoupon()
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({})
  const [couponError, setCouponError] = useState<string>()

  const items = cart.data?.items ?? []
  const blockers = quote.data?.issues.filter((issue) => issue.blocking) ?? []

  function setItemError(itemId: string, message: string | undefined) {
    setItemErrors((current) => {
      const { [itemId]: _removed, ...rest } = current
      return message ? { ...rest, [itemId]: message } : rest
    })
  }

  function changeQuantity(item: CartItem, quantity: number) {
    setItemError(item.id, undefined)
    updateItem.mutate(
      { itemId: item.id, quantity },
      {
        // The optimistic value was rolled back; say why next to the line.
        onError: (error) =>
          setItemError(
            item.id,
            errorMessage(error, 'Não foi possível alterar a quantidade. Tente novamente.'),
          ),
      },
    )
  }

  function remove(item: CartItem) {
    setItemError(item.id, undefined)
    removeItem.mutate(
      { itemId: item.id },
      {
        onSuccess: () => notify.success(`${item.name} removido do carrinho.`, { id: 'cart' }),
        onError: (error) =>
          notify.error(`Não foi possível remover ${item.name}.`, {
            id: 'cart',
            description: errorMessage(error),
          }),
      },
    )
  }

  function apply(code: string) {
    setCouponError(undefined)
    applyCoupon.mutate(
      { code },
      {
        onSuccess: (next) =>
          notify.success(`Código ${next.couponCode ?? code.toUpperCase()} aplicado.`, {
            id: 'coupon',
          }),
        onError: (error) =>
          setCouponError(
            isApiError(error)
              ? (error.fieldErrors.code?.[0] ?? error.message)
              : errorMessage(error),
          ),
      },
    )
  }

  function removeAppliedCoupon() {
    setCouponError(undefined)
    removeCoupon.mutate(undefined, {
      onSuccess: () => notify.info('Código promocional removido.', { id: 'coupon' }),
      onError: (error) => setCouponError(errorMessage(error)),
    })
  }

  const checkoutDisabledReason =
    blockers.length > 0
      ? 'Remova ou ajuste os itens indisponíveis para continuar.'
      : review.changes.length > 0
        ? 'Confira as alterações do carrinho antes de continuar.'
        : undefined

  return (
    <AppShell
      activeNav="mercado"
      mobileTab={false}
      mobileTopBar={{
        variant: 'inner',
        title: 'Carrinho de NFTs',
        backTo: '/',
      }}
      mainClassName="md:pt-[30px]"
    >
      <h1 className="sr-only">Carrinho de NFTs</h1>
      <div className="container-page mb-2 hidden md:block">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <SiteLink to="/">Início</SiteLink>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <SiteLink to="/#mercado">Mercado</SiteLink>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Carrinho</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {cart.isError && !cart.data ? (
        <div className="container-page">
          <CartError message={errorMessage(cart.error)} onRetry={() => void cart.refetch()} />
        </div>
      ) : cart.data && items.length === 0 ? (
        <div className="container-page">
          <CartEmpty to="/#mercado" />
        </div>
      ) : (
        <CartLayout
          notices={
            review.changes.length > 0 || blockers.length > 0 ? (
              <CartNotices
                changes={review.changes}
                blockers={blockers}
                onAccept={review.changes.length > 0 ? review.accept : undefined}
              />
            ) : undefined
          }
          items={
            cart.data ? (
              <CartItems
                items={items}
                getHref={itemHref}
                onQuantityChange={changeQuantity}
                onRemove={remove}
                pendingItemIds={pendingItems}
                itemErrors={itemErrors}
                blockers={blockers}
              />
            ) : (
              <CartItemsSkeleton rows={3} />
            )
          }
          summary={
            <CartSummary
              quote={quote.data}
              loading={!quote.data && !quote.isError}
              refreshing={quote.isFetching}
              error={quote.isError && !quote.data ? errorMessage(quote.error) : undefined}
              onRetry={() => void quote.refetch()}
              coupon={{
                applied: quote.data?.coupon ?? null,
                pending: applyCoupon.isPending || removeCoupon.isPending,
                error: couponError,
                onApply: apply,
                onRemove: removeAppliedCoupon,
              }}
              checkoutTo="/pagamento"
              checkoutDisabledReason={checkoutDisabledReason}
              continueTo="/#mercado"
            />
          }
        />
      )}

      <div className="container-page mt-[94px] hidden md:block">
        <AlsoViewed exclude={new Set(items.map((item) => item.nftId))} />
      </div>
    </AppShell>
  )
}
