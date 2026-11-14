import { useId } from 'react'

import { WalletIcon } from '@/components/icons'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { WalletProvider } from '@/contracts'
import { cn } from '@/lib/utils'

import { PROVIDER_LABELS } from '../labels'

/** Order of the frame: WalletConnect, MetaMask, Coinbase Wallet. */
const PROVIDERS: WalletProvider[] = ['walletconnect', 'metamask', 'coinbase']

export interface ProviderOptionsProps {
  value: WalletProvider | undefined
  onChange: (value: WalletProvider) => void
  /** `rows`: desktop frame (404x44 bordered rows). `cards`: mobile frame (359x65). */
  variant: 'rows' | 'cards'
  /** Id of the heading that names the group. */
  labelledBy: string
  /** Validation message of the field, when no wallet type is chosen. */
  error?: string
  disabled?: boolean
}

/** The chip of the frame's first option: WalletConnect bridges several wallets. */
function BrandsChip() {
  return (
    <span
      aria-hidden="true"
      className="inline-flex h-[26px] w-[224px] items-center rounded-md border border-line-strong bg-band pr-0 pl-[7px] text-2xs leading-3 font-bold tracking-[0.1px] whitespace-nowrap text-amber"
    >
      METAMASK&nbsp;&nbsp;•&nbsp;&nbsp;WALLETCONNECT&nbsp;&nbsp;•&nbsp;&nbsp;COINBASE
    </span>
  )
}

/**
 * "Carteira e rede": which wallet app signs the payment. It is the same form field
 * as "Tipo de carteira" — the two controls stay in sync.
 */
export function ProviderOptions({
  value,
  onChange,
  variant,
  labelledBy,
  error,
  disabled,
}: ProviderOptionsProps) {
  const id = useId()
  const errorId = `${id}-error`

  return (
    <div>
      <RadioGroup
        aria-labelledby={labelledBy}
        aria-describedby={error ? errorId : undefined}
        aria-invalid={error ? true : undefined}
        value={value ?? ''}
        onValueChange={(next) => onChange(next as WalletProvider)}
        disabled={disabled}
        className="gap-4"
      >
        {PROVIDERS.map((provider) => {
          const optionId = `${id}-${provider}`
          const checked = value === provider
          return variant === 'rows' ? (
            <label
              key={provider}
              htmlFor={optionId}
              className={cn(
                'flex h-[45px] cursor-pointer items-center gap-2.5 rounded-[3px] border border-line px-[11px] pt-1.5',
                checked && 'border-copper',
              )}
            >
              <RadioGroupItem id={optionId} value={provider} className="border-copper" />
              {provider === 'walletconnect' && <BrandsChip />}
              <span className={cn('text-15', provider === 'walletconnect' && 'sr-only')}>
                {PROVIDER_LABELS[provider]}
              </span>
            </label>
          ) : (
            <label
              key={provider}
              htmlFor={optionId}
              className={cn(
                'flex h-[65px] cursor-pointer items-center gap-[11px] rounded-[15px] border border-transparent bg-surface pr-[18px] pl-[14px] shadow-lg',
                checked && 'border-copper/60',
              )}
            >
              <span
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface-raised text-sm font-bold text-amber"
              >
                {provider === 'coinbase' ? (
                  <WalletIcon size={19} className="text-copper" />
                ) : provider === 'metamask' ? (
                  'M'
                ) : (
                  'W'
                )}
              </span>
              <span className="min-w-0 flex-1 text-sm">{PROVIDER_LABELS[provider]}</span>
              <RadioGroupItem id={optionId} value={provider} />
            </label>
          )
        })}
      </RadioGroup>
      {error && (
        <p id={errorId} role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
