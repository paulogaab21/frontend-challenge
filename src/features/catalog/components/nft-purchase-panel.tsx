import { useId, type ReactNode } from 'react'
import { RadioGroup as RadioPrimitive } from 'radix-ui'
import type { Edition, NftDetail } from '@/contracts'
import {
  CheckIcon,
  HeartFilledIcon,
  HeartIcon,
  LinkedinIcon,
  MessageIcon,
  ShopIcon,
  StarIcon,
  TwitterIcon,
} from '@/components/icons'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertIcon } from '@/components/icons'
import { formatEth } from '@/lib/money'
import { QuantityStepper } from './quantity-stepper'
import { RatingStars } from './rating-stars'
export interface NftPurchasePanelProps {
  nft: NftDetail
  editions: Edition[]
  selectedEditionId: Edition['id']
  onEditionChange: (id: Edition['id']) => void
  quantity: number
  onQuantityChange: (quantity: number) => void
  maxQuantity: number
  onBuy: () => void
  buyPending?: boolean
  isFavorite: boolean
  onToggleFavorite: () => void
  favoritePending?: boolean
  onAddToCart?: () => void
  addPending?: boolean
  shareLinks: { linkedin: string; email: string; twitter: string }
  notice?: ReactNode
  error?: string
  disabled?: boolean
  mobileDescription?: string
}
export function NftPurchasePanel({
  nft,
  editions,
  selectedEditionId,
  onEditionChange,
  quantity,
  onQuantityChange,
  maxQuantity,
  onBuy,
  buyPending,
  isFavorite,
  onToggleFavorite,
  favoritePending,
  onAddToCart,
  addPending,
  shareLinks,
  notice,
  error,
  disabled,
  mobileDescription,
}: NftPurchasePanelProps) {
  const id = useId()
  const selected = editions.find((edition) => edition.id === selectedEditionId)
  const soldOut = !selected || selected.available === 0 || nft.available === 0
  const blocked = disabled || soldOut || buyPending
  return (
    <section
      aria-label="Informações e compra do NFT"
      className="relative z-10 -mt-[114px] min-w-0 rounded-t-[30px] bg-surface px-6 pt-8 pb-[200px] md:mt-0 md:rounded-none md:bg-transparent md:p-0"
    >
      <div className="flex items-center justify-between gap-3">
        <h1 className="min-w-0 text-xl leading-7 font-bold md:text-28 md:leading-9">{nft.name}</h1>
        <span
          className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-copper px-1.5 text-sm md:hidden"
          aria-label={`${nft.rating.average.toLocaleString('pt-BR')} de 5, ${nft.rating.count} avaliações`}
        >
          <StarIcon size={14} className="text-amber" />
          {nft.rating.average.toLocaleString('pt-BR')}
          <span className="text-sand">({nft.rating.count})</span>
        </span>
      </div>
      <div className="hidden flex-wrap items-center justify-between gap-2 border-b border-hairline py-2 md:flex">
        <p className="text-22 leading-7 font-bold text-amber" aria-live="polite">
          {selected ? formatEth(selected.price) : 'Esgotado'}
        </p>
        <div className="flex flex-wrap items-center gap-1">
          <RatingStars value={nft.rating.average} />
          <span className="text-15">{nft.rating.count} avaliações de colecionadores</span>
        </div>
      </div>
      <h2 className="mt-3 hidden text-15 font-bold md:block">Sobre este NFT:</h2>
      <p className="mt-3 hidden text-sm leading-6 text-sand md:block">{nft.description}</p>
      <p className="mt-4 text-sm leading-6 text-sand md:hidden">
        {mobileDescription ?? nft.description}
      </p>
      <fieldset disabled={disabled || buyPending} className="mt-3 md:mt-0">
        <legend className="mb-2 text-15 font-bold md:mb-3">Edição:</legend>
        <RadioPrimitive.Root
          aria-label="Edição"
          value={selectedEditionId}
          onValueChange={(value) => {
            const edition = editions.find((item) => item.id === value)
            if (edition) onEditionChange(edition.id)
          }}
          className="flex flex-wrap gap-2"
        >
          {editions.map((edition) => (
            <RadioPrimitive.Item
              key={edition.id}
              value={edition.id}
              disabled={edition.available === 0}
              aria-label={`${edition.label}${edition.available === 0 ? ', esgotada' : ''}`}
              className="group inline-flex h-7 items-center justify-center gap-1 rounded-[50%] border-2 border-line px-1 text-sm text-sand disabled:cursor-not-allowed disabled:line-through disabled:opacity-50 data-[state=checked]:border-copper data-[state=checked]:font-medium data-[state=checked]:text-amber"
            >
              <RadioPrimitive.Indicator>
                <CheckIcon size={10} />
              </RadioPrimitive.Indicator>
              {edition.label}
            </RadioPrimitive.Item>
          ))}
        </RadioPrimitive.Root>
      </fieldset>
      {soldOut && (
        <p className="mt-3 font-bold text-coral" role="status">
          Esgotado
        </p>
      )}
      {notice && <div className="mt-3">{notice}</div>}
      {error && (
        <Alert variant="destructive" className="mt-3">
          <AlertIcon />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="mt-3.5 hidden flex-wrap items-start justify-between gap-3 md:flex">
        <QuantityStepper
          quantity={quantity}
          onQuantityChange={onQuantityChange}
          maxQuantity={maxQuantity}
          available={selected?.available ?? 0}
          disabled={blocked}
        />
        <div className="flex gap-2">
          <Button
            className="w-[130px] text-sm"
            onClick={onBuy}
            loading={buyPending}
            disabled={disabled || soldOut}
          >
            COMPRAR
          </Button>
          <Button
            variant="outline"
            className="w-[130px] gap-1 px-2 text-sm font-medium"
            aria-pressed={isFavorite}
            loading={favoritePending}
            onClick={onToggleFavorite}
          >
            {isFavorite ? <HeartFilledIcon /> : <HeartIcon />}
            {isFavorite ? 'Favoritado' : 'Favoritar'}
          </Button>
        </div>
      </div>
      <dl className="mt-3 space-y-3 text-15 leading-5 text-khaki md:mt-3.5">
        <div>
          <dt className="inline">ID do token: </dt>
          <dd className="inline">
            {nft.tokenId.startsWith('#') ? '' : '#'}
            {nft.tokenId}
          </dd>
        </div>
        <div>
          <dt className="inline">Coleção: </dt>
          <dd className="inline">{nft.collectionName}</dd>
        </div>
        <div>
          <dt className="inline">Atributos: </dt>
          <dd className="inline">{nft.attributes.join(', ')}</dd>
        </div>
      </dl>
      <div className="mt-3 hidden flex-wrap items-center gap-3 md:flex">
        <h2 className="text-15 font-bold">Compartilhar este NFT:</h2>
        <a href={shareLinks.linkedin} aria-label="Compartilhar no LinkedIn">
          <LinkedinIcon size={15} />
        </a>
        <a href={shareLinks.email} aria-label="Compartilhar por e-mail">
          <MessageIcon size={16} />
        </a>
        <a href={shareLinks.twitter} aria-label="Compartilhar no Twitter">
          <TwitterIcon size={16} />
        </a>
      </div>
      <div
        className="fixed inset-x-0 bottom-0 z-30 min-h-[164px] rounded-t-[30px] bg-surface px-6 pt-5 pb-[max(34px,env(safe-area-inset-bottom))] shadow-[0_0_20px_var(--background)] md:hidden"
        role="region"
        aria-label="Comprar NFT"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="pt-1 text-15 font-medium text-sand">Qtd.</span>
            <QuantityStepper
              compact
              quantity={quantity}
              onQuantityChange={onQuantityChange}
              maxQuantity={maxQuantity}
              available={selected?.available ?? 0}
              disabled={blocked}
            />
          </div>
          <p className="pt-1 text-xl font-bold text-amber" aria-live="polite">
            {selected ? formatEth(selected.price) : 'Esgotado'}
          </p>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <Button
            variant="gradient"
            size="pill"
            className="w-[196px] max-w-[calc(100%-72px)]"
            loading={buyPending}
            disabled={disabled || soldOut}
            onClick={onBuy}
          >
            Comprar NFT
          </Button>
          <Button
            variant="icon"
            size="mobile"
            className="size-[60px] rounded-full p-0 text-khaki"
            disabled={disabled || soldOut || !onAddToCart}
            loading={addPending}
            onClick={onAddToCart}
            aria-label="Adicionar ao carrinho"
            aria-describedby={soldOut ? `${id}-soldout` : undefined}
          >
            <ShopIcon size={20} />
          </Button>
        </div>
        {soldOut && (
          <span id={`${id}-soldout`} className="sr-only">
            NFT esgotado
          </span>
        )}
      </div>
    </section>
  )
}
