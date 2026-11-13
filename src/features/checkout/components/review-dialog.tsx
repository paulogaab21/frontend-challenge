import { type ReactNode } from 'react'

import { AlertIcon, ArrowRightIcon, CheckIcon, SpinnerIcon } from '@/components/icons'
import { SiteLink } from '@/components/layout/site-link'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { shortenAddress, type Collector, type Quote, type QuoteIssue } from '@/contracts'
import { formatEth, isZeroEth } from '@/lib/money'

import { NETWORK_LABELS as NETWORKS, PROVIDER_LABELS } from '../labels'

/** State of the simulated link with the wallet app. */
export type WalletLinkState =
  | { status: 'connecting' }
  | { status: 'connected' }
  /** The collector refused the connection request in the wallet. */
  | { status: 'rejected'; message: string }
  /** The connection existed and was dropped. */
  | { status: 'disconnected' }
  /** The request could not be completed (network, server). */
  | { status: 'failed'; message: string }

export interface ReviewNotice {
  tone: 'warning' | 'error'
  title: string
  message: string
}

export interface ReviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Validated collector data being reviewed. */
  collector: Collector | null
  quote: Quote | undefined
  /** The quote is being re-checked against current prices and stock. */
  revalidating: boolean
  /** Changes since the values the collector last accepted. */
  changes: QuoteIssue[]
  /** Problems that prevent the purchase until the cart is fixed. */
  blockers: QuoteIssue[]
  onAcceptChanges: () => void
  wallet: WalletLinkState
  onConnect: () => void
  /** The order request is in flight. */
  submitting: boolean
  /** Outcome of the last attempt that the collector must know about. */
  notice?: ReviewNotice
  /** Label of the primary action ("Confirmar e pagar" / "Tentar novamente"). */
  confirmLabel?: string
  onConfirm: () => void
  cartTo: string
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-hairline pt-4">
      <h3 className="text-15 leading-5 font-bold">{title}</h3>
      <div className="mt-2 text-sm leading-6 text-sand">{children}</div>
    </section>
  )
}

function WalletStatus({ wallet, onConnect }: Pick<ReviewDialogProps, 'wallet' | 'onConnect'>) {
  switch (wallet.status) {
    case 'connecting':
      return (
        <p role="status" className="flex items-center gap-2 text-cream">
          <SpinnerIcon size={16} className="text-amber motion-safe:animate-spin" />
          Aguardando a aprovação na carteira…
        </p>
      )
    case 'connected':
      return (
        <p role="status" className="flex items-center gap-2 text-cream">
          <CheckIcon size={16} className="text-success" />
          Carteira conectada
        </p>
      )
    default:
      return (
        <div role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <p className="flex min-w-0 flex-1 items-start gap-2 text-cream">
            <AlertIcon size={16} className="mt-1 shrink-0 text-coral" />
            <span>
              {wallet.status === 'disconnected'
                ? 'A carteira foi desconectada. Conecte novamente para concluir a compra.'
                : wallet.message}
            </span>
          </p>
          <Button size="sm" variant="outline" onClick={onConnect}>
            {wallet.status === 'disconnected' ? 'Reconectar carteira' : 'Tentar conectar novamente'}
          </Button>
        </div>
      )
  }
}

/**
 * Last step before paying: everything that will be sent, the state of the wallet
 * connection and — if anything changed since the collector last saw the values —
 * what changed, which must be accepted before the purchase can be confirmed.
 */
export function ReviewDialog({
  open,
  onOpenChange,
  collector,
  quote,
  revalidating,
  changes,
  blockers,
  onAcceptChanges,
  wallet,
  onConnect,
  submitting,
  notice,
  confirmLabel = 'Confirmar e pagar',
  onConfirm,
  cartTo,
}: ReviewDialogProps) {
  const blocked = blockers.length > 0
  const ready =
    Boolean(quote) &&
    !revalidating &&
    !blocked &&
    changes.length === 0 &&
    wallet.status === 'connected'

  const waitingFor = !quote
    ? 'Calculando os valores do pedido…'
    : revalidating
      ? 'Revalidando preços, disponibilidade e taxas…'
      : blocked
        ? 'Resolva os itens indisponíveis no carrinho para continuar.'
        : changes.length > 0
          ? 'Aceite os novos valores para continuar.'
          : wallet.status !== 'connected'
            ? 'Conecte a carteira para continuar.'
            : null

  return (
    <Dialog
      open={open}
      // A request in flight cannot be abandoned by closing the dialog.
      onOpenChange={(next) => (submitting ? undefined : onOpenChange(next))}
    >
      <DialogContent
        className="max-w-[578px] gap-4 px-6 pt-8 pb-7 md:px-11"
        showCloseButton={!submitting}
        onInteractOutside={(event) => submitting && event.preventDefault()}
        onEscapeKeyDown={(event) => submitting && event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="font-bold">Revise seu pedido</DialogTitle>
          <DialogDescription>
            Confira os dados abaixo. A compra só é enviada depois da sua confirmação.
          </DialogDescription>
        </DialogHeader>

        {notice && (
          <div
            role="alert"
            className={`flex items-start gap-3 rounded-[3px] border p-3 text-sm ${
              notice.tone === 'error' ? 'border-coral' : 'border-copper'
            }`}
          >
            <AlertIcon
              size={18}
              className={`mt-0.5 shrink-0 ${notice.tone === 'error' ? 'text-coral' : 'text-amber'}`}
            />
            <div className="min-w-0">
              <p className="font-bold text-cream">{notice.title}</p>
              <p className="mt-1 text-sand">{notice.message}</p>
            </div>
          </div>
        )}

        {changes.length > 0 && (
          <div
            className="rounded-[3px] border border-copper p-3 text-sm"
            data-testid="quote-changes"
          >
            <p className="flex items-center gap-2 font-bold text-cream">
              <AlertIcon size={18} className="shrink-0 text-amber" />
              Os valores do seu pedido mudaram
            </p>
            <ul className="mt-2 space-y-2 text-sand">
              {changes.map((issue, index) => (
                <li key={`${issue.type}-${issue.itemId ?? index}`}>
                  <p>{issue.message}</p>
                  {issue.type === 'price_changed' &&
                    issue.previous !== undefined &&
                    issue.current !== undefined && (
                      <p className="mt-0.5 flex flex-wrap items-center gap-2">
                        <span>{formatEth(issue.previous)}</span>
                        <ArrowRightIcon size={14} />
                        <span className="sr-only">para</span>
                        <strong className="text-amber">{formatEth(issue.current)}</strong>
                      </p>
                    )}
                </li>
              ))}
            </ul>
            <Button size="sm" className="mt-3" onClick={onAcceptChanges} disabled={submitting}>
              Aceitar novos valores
            </Button>
          </div>
        )}

        {blocked && (
          <div role="alert" className="rounded-[3px] border border-coral p-3 text-sm">
            <p className="flex items-center gap-2 font-bold text-cream">
              <AlertIcon size={18} className="shrink-0 text-coral" />
              Itens indisponíveis
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sand">
              {blockers.map((issue, index) => (
                <li key={`${issue.type}-${issue.itemId ?? index}`}>{issue.message}</li>
              ))}
            </ul>
            <Button size="sm" variant="outline" className="mt-3" asChild>
              <SiteLink to={cartTo}>Voltar ao carrinho</SiteLink>
            </Button>
          </div>
        )}

        {collector && (
          <>
            <Section title="Carteira e rede">
              <p className="text-cream">
                {PROVIDER_LABELS[collector.provider]} ·{' '}
                <abbr title={collector.walletAddress} className="no-underline">
                  {shortenAddress(collector.walletAddress)}
                </abbr>{' '}
                · Rede {NETWORKS[collector.network]}
              </p>
              <div className="mt-1">
                <WalletStatus wallet={wallet} onConnect={onConnect} />
              </div>
            </Section>

            <Section title="Colecionador">
              <dl className="grid gap-x-4 sm:grid-cols-2">
                <div>
                  <dt className="inline text-khaki">Nome: </dt>
                  <dd className="inline break-words text-cream">{collector.displayName}</dd>
                </div>
                <div>
                  <dt className="inline text-khaki">Usuário: </dt>
                  <dd className="inline break-words text-cream">{collector.username}</dd>
                </div>
                <div>
                  <dt className="inline text-khaki">E-mail: </dt>
                  <dd className="inline break-all text-cream">{collector.email}</dd>
                </div>
                <div>
                  <dt className="inline text-khaki">ENS: </dt>
                  <dd className="inline break-all text-cream">
                    {collector.ensName}
                    {collector.ensSuffix}
                  </dd>
                </div>
              </dl>
            </Section>
          </>
        )}

        <Section title="Itens e valores">
          {quote ? (
            <>
              <ul className="space-y-1">
                {quote.items.map((item) => (
                  <li key={item.id} className="flex justify-between gap-3">
                    <span className="min-w-0 break-words text-cream">
                      {item.name}{' '}
                      <span className="text-sand">
                        · edição {item.editionLabel} · x {item.quantity}
                      </span>
                    </span>
                    <span className="shrink-0 text-cream">{formatEth(item.lineTotal)}</span>
                  </li>
                ))}
              </ul>
              <dl className="mt-3 space-y-0.5 border-t border-line pt-2">
                <div className="flex justify-between gap-3">
                  <dt>Subtotal</dt>
                  <dd className="text-cream">{formatEth(quote.subtotal)}</dd>
                </div>
                {!isZeroEth(quote.discount) && (
                  <div className="flex justify-between gap-3">
                    <dt>
                      Desconto do lançamento
                      {quote.coupon ? ` (${quote.coupon.code})` : ''}
                    </dt>
                    <dd className="text-cream">(-) {formatEth(quote.discount)}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-3">
                  <dt>Taxa de rede (estimada)</dt>
                  <dd className="text-cream">{formatEth(quote.networkFee)}</dd>
                </div>
                <div className="flex justify-between gap-3 pt-1 text-base font-bold text-cream">
                  <dt>Total</dt>
                  <dd className="text-lg text-amber" data-testid="review-total">
                    {formatEth(quote.total)}
                  </dd>
                </div>
              </dl>
            </>
          ) : (
            <p role="status">Calculando os valores do pedido…</p>
          )}
        </Section>

        <div className="mt-1 flex flex-col gap-3">
          <p role="status" className="min-h-5 text-center text-sm text-sand">
            {submitting ? 'Enviando seu pedido…' : (waitingFor ?? '')}
          </p>
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Button
              variant="outline"
              className="sm:flex-1"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Voltar e editar
            </Button>
            <Button
              className="rounded-lg sm:flex-[1.4]"
              onClick={onConfirm}
              loading={submitting}
              disabled={!ready}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
