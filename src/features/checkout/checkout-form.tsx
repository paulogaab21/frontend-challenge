import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useId, useRef, useState } from 'react'
import { useForm, useWatch, type FieldErrors } from 'react-hook-form'

import { SiteLink } from '@/components/layout/site-link'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import {
  collectorSchema,
  type Collector,
  type CollectorInput,
  type CreateOrderInput,
  type Profile,
  type Wallet,
} from '@/contracts'
import { useActiveConnection, useConnectWallet } from '@/features/account/queries'
import { CartNotices } from '@/features/cart/components/cart-notices'
import { useApplyCoupon, useCart, useQuote, useRemoveCoupon } from '@/features/cart/queries'
import { useQuoteReview } from '@/features/cart/use-quote-review'
import { errorMessage, isApiError } from '@/lib/http'
import { formatEth } from '@/lib/money'
import { notify } from '@/lib/notify'
import { cn } from '@/lib/utils'
import { useIsDesktop } from '@/lib/use-media-query'

import { CheckoutSummary } from './components/checkout-summary'
import { CollectorFields } from './components/collector-fields'
import { ProviderOptions } from './components/provider-options'
import { ReviewDialog, type ReviewNotice, type WalletLinkState } from './components/review-dialog'
import { WalletChoiceGroup } from './components/wallet-choice'
import { checkoutDraft, type WalletChoice } from './draft-store'
import { usePlaceOrder, type PlaceOrderOutcome } from './use-place-order'

const NOTE_MAX = 280

/** Form fields a registered wallet fills in. */
function walletValues(wallet: Wallet): Partial<CollectorInput> {
  return {
    network: wallet.network,
    profileName: wallet.profileName,
    walletAddress: wallet.address,
    secondaryAddress: wallet.secondaryAddress ?? '',
    provider: wallet.provider,
    referralCode: wallet.referralCode,
  }
}

/** Starting values: what the account already knows about the collector. */
function initialValues(profile: Profile, wallet: Wallet | undefined): Partial<CollectorInput> {
  return {
    displayName: profile.displayName,
    username: profile.username,
    email: profile.email,
    ensName: profile.ensName,
    ensSuffix: profile.ensSuffix,
    profileName: profile.displayName,
    walletAddress: '',
    secondaryAddress: '',
    referralCode: '',
    note: '',
    ...(wallet ? walletValues(wallet) : {}),
  }
}

export interface CheckoutFormProps {
  userId: string
  profile: Profile
  wallets: Wallet[]
}

/**
 * The payment screen proper: collector data, wallet and network, the priced
 * summary, and the review step that sends the order.
 *
 * Sequence of a purchase:
 *   fill / confirm data → "Confirmar compra" validates the form → review dialog
 *   (wallet connection is requested, the quote is revalidated, any change must be
 *   accepted) → "Confirmar e pagar" sends the order → order page.
 */
export function CheckoutForm({ userId, profile, wallets }: CheckoutFormProps) {
  const navigate = useNavigate()
  const desktop = useIsDesktop()
  const headingId = useId()
  const providerHeadingId = useId()
  const dataSection = useRef<HTMLDetailsElement>(null)

  /* ---- form state, restored from the draft of this user when there is one ---- */
  const [draft] = useState(() => checkoutDraft.get(userId))
  const [walletChoice, setWalletChoice] = useState<WalletChoice>(() => {
    const saved = draft?.walletChoice
    if (saved === 'other' || wallets.some((wallet) => wallet.id === saved))
      return saved as WalletChoice
    return wallets.find((wallet) => wallet.role === 'primary')?.id ?? wallets[0]?.id ?? 'other'
  })
  const chosenWallet = wallets.find((wallet) => wallet.id === walletChoice)

  const form = useForm<CollectorInput, unknown, Collector>({
    resolver: zodResolver(collectorSchema, {
      error: (issue) => {
        if (issue.code !== 'invalid_value') return undefined
        if (issue.path?.[0] === 'network') return 'Selecione uma rede'
        if (issue.path?.[0] === 'provider') return 'Selecione uma carteira'
        return undefined
      },
    }),
    defaultValues: draft?.values ?? initialValues(profile, chosenWallet),
    mode: 'onBlur',
    shouldFocusError: true,
  })
  const { control, setValue, clearErrors, setError, setFocus, getValues } = form
  const network = useWatch({ control, name: 'network' })
  const provider = useWatch({ control, name: 'provider' })
  const note = useWatch({ control, name: 'note' })

  // Keep the draft current, so a refresh or a re-login resumes the same checkout.
  const values = useWatch({ control })
  useEffect(() => {
    checkoutDraft.save(userId, { ...getValues(), ...values } as CollectorInput, walletChoice)
  }, [values, walletChoice, userId, getValues])

  function chooseWallet(choice: WalletChoice) {
    setWalletChoice(choice)
    const wallet = wallets.find((item) => item.id === choice)
    if (wallet) {
      for (const [name, value] of Object.entries(walletValues(wallet))) {
        setValue(name as keyof CollectorInput, value, { shouldDirty: true, shouldValidate: true })
      }
    } else {
      // Another wallet: the address must be typed.
      setValue('walletAddress', '', { shouldDirty: true })
      setValue('secondaryAddress', '', { shouldDirty: true })
      clearErrors(['walletAddress', 'secondaryAddress'])
      if (dataSection.current) dataSection.current.open = true
      setTimeout(() => setFocus('walletAddress'))
    }
  }

  /* ---- priced summary ---- */
  const cart = useCart()
  const quote = useQuote(network ?? 'ethereum')
  const review = useQuoteReview()
  const applyCoupon = useApplyCoupon()
  const removeCoupon = useRemoveCoupon()
  const [couponError, setCouponError] = useState<string>()
  const blockers = quote.data?.issues.filter((issue) => issue.blocking) ?? []
  /** The numbers on screen belong to a previous cart/network: not confirmable. */
  const quoteOutdated = quote.isFetching || quote.isPlaceholderData

  /* ---- wallet connection (simulated) ---- */
  const connection = useActiveConnection().data?.connection ?? null
  const connect = useConnectWallet()
  const [link, setLink] = useState<WalletLinkState>({ status: 'connecting' })

  /* ---- review and submission ---- */
  const [reviewing, setReviewing] = useState<Collector | null>(null)
  const [notice, setNotice] = useState<ReviewNotice>()
  const { place, isPending: submitting } = usePlaceOrder()

  const connectionMatches =
    reviewing !== null &&
    connection !== null &&
    connection.status === 'connected' &&
    connection.address === reviewing.walletAddress &&
    connection.provider === reviewing.provider &&
    connection.network === reviewing.network
  // A connection that was established and then dropped (wallet.updated) shows up
  // here: the cache no longer reports it as connected.
  const effectiveLink: WalletLinkState =
    link.status === 'connected' && !connectionMatches ? { status: 'disconnected' } : link

  async function connectWallet(values: Collector) {
    setLink({ status: 'connecting' })
    try {
      await connect.mutateAsync({
        walletId: walletChoice === 'other' ? null : walletChoice,
        address: values.walletAddress,
        provider: values.provider,
        network: values.network,
      })
      setLink({ status: 'connected' })
    } catch (error) {
      setLink(
        isApiError(error, 'WALLET_CONNECTION_REJECTED')
          ? { status: 'rejected', message: error.message }
          : { status: 'failed', message: errorMessage(error) },
      )
    }
  }

  function openReview(values: Collector) {
    setNotice(undefined)
    setReviewing(values)
    // Revalidate price, stock, coupon and fees right before the collector reviews.
    void quote.refetch()
    const alreadyLinked =
      connection?.status === 'connected' &&
      connection.address === values.walletAddress &&
      connection.provider === values.provider &&
      connection.network === values.network
    if (alreadyLinked) setLink({ status: 'connected' })
    else void connectWallet(values)
  }

  function onInvalid(errors: FieldErrors<CollectorInput>) {
    // The data section may be collapsed on small screens: open it so the first
    // invalid field can receive focus.
    if (dataSection.current) dataSection.current.open = true
    const first = Object.keys(errors)[0] as keyof CollectorInput | undefined
    if (first) setTimeout(() => setFocus(first))
    notify.error('Revise os campos destacados para continuar.', { id: 'checkout' })
  }

  function handleOutcome(outcome: PlaceOrderOutcome | null) {
    if (!outcome) return
    switch (outcome.kind) {
      case 'created':
        setReviewing(null)
        void navigate({ to: '/pedido/$orderId', params: { orderId: outcome.order.id } })
        break
      case 'stale':
        // The dialog now lists what changed and asks for a new confirmation.
        notify.warning('Os valores do pedido mudaram. Revise antes de confirmar.', {
          id: 'checkout',
        })
        break
      case 'pending-order':
        setReviewing(null)
        if (outcome.orderId) {
          void navigate({ to: '/pedido/$orderId', params: { orderId: outcome.orderId } })
        }
        break
      case 'wallet-disconnected':
        setLink({ status: 'disconnected' })
        break
      case 'cart-empty':
        setReviewing(null)
        void navigate({ to: '/carrinho' })
        break
      case 'invalid': {
        setReviewing(null)
        const fields = Object.entries(outcome.failure.fieldErrors ?? {})
        fields.forEach(([name, message], index) =>
          setError(
            name as keyof CollectorInput,
            { type: 'server', message },
            { shouldFocus: index === 0 },
          ),
        )
        if (dataSection.current) dataSection.current.open = true
        notify.error(outcome.failure.formError ?? 'Revise os campos destacados para continuar.', {
          id: 'checkout',
        })
        break
      }
      case 'unknown':
        // The page switches to the recovery panel (the attempt is still stored).
        setReviewing(null)
        break
      case 'session-expired':
        setReviewing(null)
        break
      case 'failed':
        setNotice({
          tone: 'error',
          title: 'Não foi possível concluir a compra',
          message: outcome.message,
        })
        break
    }
  }

  async function confirm() {
    if (!reviewing || !quote.data || !connection || quoteOutdated) return
    setNotice(undefined)
    const request: CreateOrderInput = {
      quoteId: quote.data.id,
      quoteFingerprint: quote.data.fingerprint,
      walletId: walletChoice === 'other' ? null : walletChoice,
      connectionId: connection.id,
      collector: reviewing,
    }
    handleOutcome(await place(request))
  }

  /* ---- coupon ---- */
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
  const coupon = {
    applied: quote.data?.coupon ?? null,
    pending: applyCoupon.isPending || removeCoupon.isPending,
    error: couponError,
    onApply: apply,
    onRemove: () => {
      setCouponError(undefined)
      removeCoupon.mutate(undefined, {
        onSuccess: () => notify.info('Código promocional removido.', { id: 'coupon' }),
        onError: (error) => setCouponError(errorMessage(error)),
      })
    },
  }

  const confirmDisabledReason =
    blockers.length > 0 ? 'Há itens indisponíveis no carrinho.' : undefined
  const providerError = form.formState.errors.provider?.message

  const notices =
    review.changes.length > 0 || blockers.length > 0 ? (
      <CartNotices
        changes={review.changes}
        blockers={blockers}
        onAccept={review.changes.length > 0 ? review.accept : undefined}
        acceptLabel="Aceitar novos valores"
      />
    ) : null

  const summary = (
    <CheckoutSummary
      quote={quote.data}
      loading={!quote.data && !quote.isError}
      refreshing={quote.isFetching}
      error={quote.isError && !quote.data ? errorMessage(quote.error) : undefined}
      onRetry={() => void quote.refetch()}
      expectedItems={cart.data?.items.length}
      coupon={coupon}
    />
  )

  const noteField = (
    <FormField
      control={control}
      name="note"
      render={({ field }) => (
        <FormItem className="gap-2">
          <FormLabel>Observação do colecionador (opcional)</FormLabel>
          <FormControl>
            <Textarea
              {...field}
              value={field.value ?? ''}
              maxLength={NOTE_MAX}
              rows={5}
              className="min-h-[152px] rounded-[3px] md:max-w-[350px]"
            />
          </FormControl>
          {/* The counter appears once there is something to count. */}
          <FormDescription
            className={cn('text-xs leading-4 text-khaki', !(note ?? '').length && 'sr-only')}
          >
            {(note ?? '').length}/{NOTE_MAX} caracteres
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  )

  const blockedNote = confirmDisabledReason && (
    <p className="mt-2 text-center text-sm text-sand">
      {confirmDisabledReason}{' '}
      <SiteLink to="/carrinho" className="text-amber underline underline-offset-4">
        Voltar ao carrinho
      </SiteLink>
    </p>
  )

  return (
    <Form {...form}>
      <form
        noValidate
        aria-labelledby={headingId}
        onSubmit={(event) => void form.handleSubmit(openReview, onInvalid)(event)}
      >
        {desktop ? (
          <div className="mt-7 grid min-w-0 gap-x-8 gap-y-10 lg:grid-cols-[minmax(0,1fr)_405px]">
            <section aria-labelledby={headingId} className="min-w-0">
              <h2 id={headingId} className="mb-[9px] text-17 leading-6 font-bold">
                Perfil do colecionador
              </h2>
              <CollectorFields form={form} addressLocked={walletChoice !== 'other'} />
              <div className="mt-[22px]">
                <WalletChoiceGroup
                  variant="inline"
                  wallets={wallets}
                  value={walletChoice}
                  onChange={chooseWallet}
                  manageTo="/conta/carteiras"
                />
              </div>
              <div className="mt-[18px]">{noteField}</div>
            </section>

            <div className="min-w-0">
              {notices && <div className="mb-5">{notices}</div>}
              {summary}
              <h2
                id={providerHeadingId}
                className="mt-1 mb-[15px] text-center text-17 leading-6 font-bold"
              >
                Carteira e rede
              </h2>
              <ProviderOptions
                variant="rows"
                labelledBy={providerHeadingId}
                value={provider}
                onChange={(next) =>
                  setValue('provider', next, { shouldDirty: true, shouldValidate: true })
                }
                error={providerError}
              />
              <Button
                type="submit"
                className="mt-6 h-[45px] w-full rounded-lg text-15"
                disabled={Boolean(confirmDisabledReason)}
              >
                Confirmar compra
              </Button>
              {blockedNote}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <h2 id={headingId} className="sr-only">
              Pagamento com carteira
            </h2>
            <WalletChoiceGroup
              variant="cards"
              wallets={wallets}
              value={walletChoice}
              onChange={chooseWallet}
              manageTo="/conta/carteiras"
            />

            <section aria-labelledby={providerHeadingId}>
              <h2 id={providerHeadingId} className="mb-3 text-base leading-6 font-bold">
                Carteira e rede
              </h2>
              <ProviderOptions
                variant="cards"
                labelledBy={providerHeadingId}
                value={provider}
                onChange={(next) =>
                  setValue('provider', next, { shouldDirty: true, shouldValidate: true })
                }
                error={providerError}
              />
            </section>

            <details
              ref={dataSection}
              // Open from the start when there is something to fill in.
              open={walletChoice === 'other' || wallets.length === 0 || undefined}
              className="group rounded-[15px] bg-surface px-[18px] py-4"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-3 text-base font-bold">
                Dados do colecionador
                <span className="text-sm font-normal text-amber group-open:hidden">Editar</span>
                <span className="hidden text-sm font-normal text-amber group-open:inline">
                  Recolher
                </span>
              </summary>
              <div className="mt-4 space-y-[15px]">
                <CollectorFields form={form} addressLocked={walletChoice !== 'other'} />
                {noteField}
              </div>
            </details>

            <details className="group rounded-[15px] bg-surface px-[18px] py-4">
              <summary className="flex cursor-pointer items-center justify-between gap-3 text-base font-bold">
                Resumo do pedido
                <span className="text-sm font-normal text-amber group-open:hidden">Ver itens</span>
                <span className="hidden text-sm font-normal text-amber group-open:inline">
                  Recolher
                </span>
              </summary>
              <div className="mt-4">{summary}</div>
            </details>

            {notices}

            <p className="flex items-baseline justify-end gap-7 text-base font-bold">
              Total:
              <span className="text-lg text-amber">
                {quote.data ? formatEth(quote.data.total) : '—'}
              </span>
            </p>

            {/* Anchored to the bottom of the screen, as in the mobile frame. */}
            <div className="sticky bottom-8 z-10 pt-6">
              <Button
                type="submit"
                variant="gradient"
                size="pill"
                className="w-full text-15"
                disabled={Boolean(confirmDisabledReason)}
              >
                Confirmar compra
              </Button>
              {blockedNote}
            </div>
          </div>
        )}
      </form>

      <ReviewDialog
        open={reviewing !== null}
        onOpenChange={(open) => {
          if (!open) setReviewing(null)
        }}
        collector={reviewing}
        quote={quote.data}
        revalidating={quoteOutdated}
        changes={review.changes}
        blockers={blockers}
        onAcceptChanges={review.accept}
        wallet={effectiveLink}
        onConnect={() => reviewing && void connectWallet(reviewing)}
        submitting={submitting}
        notice={notice}
        onConfirm={() => void confirm()}
        cartTo="/carrinho"
      />
    </Form>
  )
}
