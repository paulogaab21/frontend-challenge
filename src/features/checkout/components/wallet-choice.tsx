import { useId } from 'react'

import { SiteLink } from '@/components/layout/site-link'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { shortenAddress, type Wallet } from '@/contracts'
import { cn } from '@/lib/utils'

import type { WalletChoice } from '../draft-store'
import { NETWORK_LABELS as NETWORKS } from '../labels'

export interface WalletChoiceGroupProps {
  /** Wallets registered in the account ("Carteiras"). */
  wallets: Wallet[]
  value: WalletChoice
  onChange: (value: WalletChoice) => void
  /**
   * - `cards`: the "Carteira conectada" cards of the mobile payment frame;
   * - `inline`: the compact radios that end with "Usar outra carteira?" (desktop).
   */
  variant: 'cards' | 'inline'
  /** Where wallets are managed ("Trocar carteira"). */
  manageTo: string
  disabled?: boolean
}

function describe(wallet: Wallet): { title: string; address: string; network: string } {
  return {
    title: wallet.nickname,
    address: wallet.secondaryAddress?.includes('.')
      ? wallet.secondaryAddress
      : shortenAddress(wallet.address),
    network:
      wallet.role === 'primary'
        ? `Rede principal ${NETWORKS[wallet.network]}`
        : `Rede ${NETWORKS[wallet.network]}`,
  }
}

/**
 * Which wallet pays: one of the registered wallets, or another one typed for this
 * purchase. A single radio group in both layouts.
 */
export function WalletChoiceGroup({
  wallets,
  value,
  onChange,
  variant,
  manageTo,
  disabled,
}: WalletChoiceGroupProps) {
  const id = useId()
  const titleId = `${id}-title`

  if (variant === 'cards') {
    return (
      <section aria-labelledby={titleId}>
        <div className="flex items-baseline justify-between gap-3">
          <h2 id={titleId} className="text-base leading-6 font-bold">
            Carteira conectada
          </h2>
          <SiteLink to={manageTo} className="text-sm font-bold text-amber hover:underline">
            Trocar carteira
          </SiteLink>
        </div>
        <RadioGroup
          aria-labelledby={titleId}
          value={value}
          onValueChange={onChange}
          disabled={disabled}
          className="mt-3 gap-5"
        >
          {wallets.map((wallet) => {
            const info = describe(wallet)
            const optionId = `${id}-${wallet.id}`
            return (
              <label
                key={wallet.id}
                htmlFor={optionId}
                className={cn(
                  'flex min-h-[93px] cursor-pointer items-center gap-[19px] rounded-[14px] border border-transparent bg-surface px-[19px] py-3 shadow-lg',
                  value === wallet.id && 'border-copper/60',
                )}
              >
                <RadioGroupItem id={optionId} value={wallet.id} />
                <span className="min-w-0">
                  <span className="block text-base leading-6 font-bold">{info.title}</span>
                  <span className="block text-sm leading-[22px] break-words text-sand">
                    {info.address}
                  </span>
                  <span className="block text-sm leading-[22px] text-sand">{info.network}</span>
                </span>
              </label>
            )
          })}
          <label
            htmlFor={`${id}-other`}
            className={cn(
              'flex min-h-[65px] cursor-pointer items-center gap-[19px] rounded-[14px] border border-transparent bg-surface px-[19px] py-3 shadow-lg',
              value === 'other' && 'border-copper/60',
            )}
          >
            <RadioGroupItem id={`${id}-other`} value="other" />
            <span className="text-15">Usar outra carteira?</span>
          </label>
        </RadioGroup>
      </section>
    )
  }

  return (
    <RadioGroup
      aria-label="Carteira usada no pagamento"
      value={value}
      onValueChange={onChange}
      disabled={disabled}
      className="gap-3"
    >
      {wallets.map((wallet) => {
        const info = describe(wallet)
        const optionId = `${id}-${wallet.id}`
        return (
          <div key={wallet.id} className="flex items-center gap-[9px]">
            <RadioGroupItem id={optionId} value={wallet.id} className="border-2 border-copper" />
            <label htmlFor={optionId} className="cursor-pointer text-15 leading-6">
              {info.title}
              <span className="text-sand">
                {' '}
                — {info.address} · {NETWORKS[wallet.network]}
              </span>
            </label>
          </div>
        )
      })}
      <div className="flex items-center gap-[9px]">
        <RadioGroupItem id={`${id}-other`} value="other" className="border-2 border-copper" />
        <label htmlFor={`${id}-other`} className="cursor-pointer text-15 leading-6">
          Usar outra carteira?
        </label>
      </div>
    </RadioGroup>
  )
}
