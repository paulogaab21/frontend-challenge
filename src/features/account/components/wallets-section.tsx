import { useId, type ReactNode } from 'react'
import type { WalletRole } from '@/contracts'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
export interface WalletsSectionProps {
  walletRole: WalletRole
  children?: ReactNode
  actionLabel?: 'Adicionar' | 'Editar'
  onAction?: () => void
  sameAsPrimary?: boolean
  onSameAsPrimaryChange?: (checked: boolean) => void
  hasPrimary?: boolean
  pending?: boolean
  helperText?: string
}
export function WalletsSection({
  walletRole,
  children,
  actionLabel = 'Adicionar',
  onAction,
  sameAsPrimary = false,
  onSameAsPrimaryChange,
  hasPrimary = false,
  pending,
  helperText,
}: WalletsSectionProps) {
  const id = useId()
  return (
    <section aria-labelledby={`${id}-title`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={`${id}-title`} className="text-17 leading-4 font-bold">
          {walletRole === 'primary' ? 'Carteira principal' : 'Carteira secundária'}
        </h2>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          {walletRole === 'secondary' && (
            <div className="flex items-center gap-2">
              <Checkbox
                id={id}
                checked={sameAsPrimary}
                onCheckedChange={(checked) => onSameAsPrimaryChange?.(checked === true)}
                disabled={!hasPrimary || pending || !onSameAsPrimaryChange}
                className="rounded-full border-copper"
              />
              <Label htmlFor={id} className="text-sm leading-4">
                Igual à carteira principal
              </Label>
            </div>
          )}
          {onAction && (
            <Button
              variant="link"
              className="text-base leading-4 font-medium"
              disabled={pending}
              onClick={onAction}
            >
              {actionLabel}
            </Button>
          )}
        </div>
      </div>
      {walletRole === 'primary' && (
        <p className="mt-1.5 text-sm leading-4 text-sand">
          {helperText ??
            'Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.'}
        </p>
      )}
      {walletRole === 'secondary' && !children && (
        <p className="mt-2 text-sm text-sand">Você ainda não adicionou uma carteira secundária.</p>
      )}
      {children && <div className={walletRole === 'primary' ? 'mt-8' : 'mt-5'}>{children}</div>}
    </section>
  )
}
