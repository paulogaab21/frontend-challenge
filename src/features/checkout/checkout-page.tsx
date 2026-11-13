import { useNavigate } from '@tanstack/react-router'
import { useState, useSyncExternalStore, type ReactNode } from 'react'

import { AppShell } from '@/app/app-shell'
import { AlertIcon, InfoIcon } from '@/components/icons'
import { SiteLink } from '@/components/layout/site-link'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useProfile, useWallets } from '@/features/account/queries'
import { useCart } from '@/features/cart/queries'
import { usePendingOrders } from '@/features/orders/queries'
import { errorMessage } from '@/lib/http'
import { notify } from '@/lib/notify'
import { sessionStore } from '@/lib/session-store'
import { useDocumentTitle } from '@/lib/use-document-title'

import { CheckoutForm } from './checkout-form'
import { usePlaceOrder, useUnresolvedAttempt } from './use-place-order'

function Panel({
  tone = 'info',
  title,
  children,
  actions,
}: {
  tone?: 'info' | 'warning'
  title: string
  children: ReactNode
  actions: ReactNode
}) {
  return (
    <section
      role={tone === 'warning' ? 'alert' : undefined}
      className="mx-auto mt-6 flex max-w-[578px] flex-col items-center gap-4 border-b-[10px] border-copper bg-surface px-6 py-10 text-center md:mt-16"
    >
      {tone === 'warning' ? (
        <AlertIcon size={40} className="text-amber" />
      ) : (
        <InfoIcon size={40} className="text-copper" />
      )}
      <h2 className="text-xl font-bold">{title}</h2>
      <div className="max-w-md text-sm leading-6 text-sand">{children}</div>
      <div className="mt-2 flex flex-wrap justify-center gap-3">{actions}</div>
    </section>
  )
}

/** Same geometry as the loaded screen, so nothing jumps when the data arrives. */
function CheckoutSkeleton() {
  return (
    <div
      role="status"
      aria-label="Carregando pagamento"
      className="mt-[26px] grid min-w-0 gap-x-8 gap-y-10 lg:grid-cols-[minmax(0,1fr)_405px]"
    >
      <div className="min-w-0">
        <Skeleton variant="line" className="mb-[9px] h-6 w-56" />
        <div className="grid gap-x-[25px] gap-y-[15px] md:grid-cols-2">
          {Array.from({ length: 10 }, (_, index) => (
            <div key={index}>
              <Skeleton variant="line" className="mb-0.5 h-6 w-40" />
              <Skeleton className="h-10 w-full rounded-[3px]" />
            </div>
          ))}
        </div>
        <Skeleton className="mt-[18px] h-[151px] w-full rounded-[3px] md:max-w-[349px]" />
      </div>
      <div className="min-w-0">
        <Skeleton variant="line" className="h-6 w-28" />
        <Skeleton variant="line" className="mt-2 h-6 w-full" />
        <div className="mt-3 space-y-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-[70px] w-full rounded-none" />
          ))}
        </div>
        <Skeleton className="mt-6 h-[150px] w-full rounded-[3px]" />
        <Skeleton className="mt-6 h-[45px] w-full" />
      </div>
      <span className="sr-only">Carregando pagamento</span>
    </div>
  )
}

/**
 * Payment route. Before showing the form it settles what state the purchase is
 * in, so a refresh or a return visit always lands on the right screen:
 *
 * 1. a previous request whose answer never arrived → recovery panel (re-sends the
 *    same Idempotency-Key, which returns the same order if it was created);
 * 2. an order still pending → points to it instead of allowing another purchase;
 * 3. an empty cart → nothing to pay;
 * 4. otherwise the checkout form.
 */
export function CheckoutPage() {
  useDocumentTitle('Pagamento')
  const navigate = useNavigate()
  const userId = useSyncExternalStore(sessionStore.subscribe, sessionStore.getUserId)
  const profile = useProfile()
  const wallets = useWallets()
  const cart = useCart()
  const pending = usePendingOrders()
  const attempt = useUnresolvedAttempt()
  const { place, isPending: verifying } = usePlaceOrder()
  const [recoveryMessage, setRecoveryMessage] = useState<string>()

  async function resend() {
    if (!attempt) return
    setRecoveryMessage(undefined)
    // Same key, same body: the API answers with the order it already created, or
    // creates it now if the first request never arrived. Never a second one.
    const outcome = await place(attempt.request)
    if (!outcome) return
    switch (outcome.kind) {
      case 'created':
        void navigate({ to: '/pedido/$orderId', params: { orderId: outcome.order.id } })
        break
      case 'pending-order':
        if (outcome.orderId) {
          void navigate({ to: '/pedido/$orderId', params: { orderId: outcome.orderId } })
        }
        break
      case 'unknown':
        setRecoveryMessage(outcome.message)
        break
      case 'stale':
        notify.warning(
          'O pedido não havia sido criado e os valores mudaram. Revise e confirme novamente.',
          { id: 'checkout', persistent: true },
        )
        break
      case 'failed':
        notify.error(outcome.message, { id: 'checkout' })
        break
      default:
        notify.info('O pedido não havia sido criado. Revise os dados e confirme novamente.', {
          id: 'checkout',
        })
    }
  }

  const loadError = profile.error ?? wallets.error ?? cart.error ?? pending.error
  const loaded = profile.data && wallets.data && cart.data && pending.data && userId
  const pendingOrder = pending.data?.items[0]

  let content: ReactNode
  if (attempt && (!verifying || attempt.status === 'unknown')) {
    content = (
      <Panel
        tone="warning"
        title="Não recebemos a confirmação do envio"
        actions={
          <>
            <Button onClick={() => void resend()} loading={verifying}>
              Verificar e concluir
            </Button>
            <Button variant="outline" asChild>
              <SiteLink to="/conta/atividade">Ver meus pedidos</SiteLink>
            </Button>
          </>
        }
      >
        <p>
          A resposta do seu último envio não chegou, então o pedido pode ou não ter sido criado. Ao
          verificar, reenviamos exatamente a mesma solicitação: se o pedido já existe ele é
          recuperado, e nenhuma compra é duplicada.
        </p>
        {recoveryMessage && (
          <p role="status" className="mt-3 text-coral">
            Ainda sem resposta: {recoveryMessage}
          </p>
        )}
      </Panel>
    )
  } else if (attempt) {
    content = (
      <Panel title="Enviando seu pedido…" actions={null}>
        <p role="status">Aguarde: estamos verificando o envio do seu pedido.</p>
      </Panel>
    )
  } else if (!loaded) {
    content = loadError ? (
      <Panel
        tone="warning"
        title="Não foi possível carregar o pagamento"
        actions={
          <Button
            onClick={() => {
              void profile.refetch()
              void wallets.refetch()
              void cart.refetch()
              void pending.refetch()
            }}
          >
            Tentar novamente
          </Button>
        }
      >
        <p>{errorMessage(loadError)}</p>
      </Panel>
    ) : (
      <CheckoutSkeleton />
    )
  } else if (pendingOrder) {
    content = (
      <Panel
        title="Você tem um pedido aguardando confirmação"
        actions={
          <Button asChild>
            <SiteLink to={`/pedido/${pendingOrder.id}`}>Acompanhar pedido</SiteLink>
          </Button>
        }
      >
        <p>
          O pedido {pendingOrder.id} ainda está sendo confirmado pela carteira e pela rede. Uma nova
          compra fica disponível assim que ele for concluído ou recusado.
        </p>
      </Panel>
    )
  } else if (cart.data.items.length === 0) {
    content = (
      <Panel
        title="Seu carrinho está vazio"
        actions={
          <Button asChild>
            <SiteLink to="/#mercado">Explorar NFTs</SiteLink>
          </Button>
        }
      >
        <p>Adicione um NFT ao carrinho para seguir ao pagamento.</p>
      </Panel>
    )
  } else {
    content = (
      <CheckoutForm
        // A different user means a different draft and different wallets.
        key={userId}
        userId={userId}
        profile={profile.data}
        wallets={wallets.data.items}
      />
    )
  }

  return (
    <AppShell
      activeNav="mercado"
      mobileTab={false}
      mobileTopBar={{ variant: 'inner', title: 'Pagamento com carteira', backTo: '/carrinho' }}
      mainClassName="md:pt-8"
    >
      <div className="container-page pb-10 md:pb-0">
        <h1 className="sr-only">Pagamento</h1>
        <div className="hidden md:block">
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
                <BreadcrumbPage>Pagamento</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        {content}
      </div>
    </AppShell>
  )
}
