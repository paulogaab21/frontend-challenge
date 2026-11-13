import type { Wallet } from '@/contracts'
import { shortenAddress } from '@/contracts'
import { WalletIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
export interface WalletSummaryProps {
  wallet: Wallet
  onEdit?: () => void
  pending?: boolean
}
const networks = { ethereum: 'Ethereum', polygon: 'Polygon', solana: 'Solana' } as const
const providers = {
  metamask: 'MetaMask',
  walletconnect: 'WalletConnect',
  coinbase: 'Coinbase Wallet',
} as const
export function WalletSummary({ wallet, onEdit, pending }: WalletSummaryProps) {
  return (
    <article className="rounded-lg border border-line bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <WalletIcon className="text-copper" />
          <h3 className="text-base font-bold">{wallet.nickname}</h3>
        </div>
        {onEdit && (
          <Button variant="link" onClick={onEdit} disabled={pending}>
            Editar
          </Button>
        )}
      </div>
      <dl className="mt-4 grid gap-3 text-sm text-sand sm:grid-cols-2">
        <div>
          <dt className="font-bold text-cream">Endereço</dt>
          <dd>
            <abbr title={wallet.address} className="no-underline">
              {shortenAddress(wallet.address)}
            </abbr>
          </dd>
        </div>
        <div>
          <dt className="font-bold text-cream">Rede</dt>
          <dd>{networks[wallet.network]}</dd>
        </div>
        <div>
          <dt className="font-bold text-cream">Tipo de carteira</dt>
          <dd>{providers[wallet.provider]}</dd>
        </div>
        <div>
          <dt className="font-bold text-cream">Nome ENS</dt>
          <dd className="break-words">
            {wallet.ensName}
            {wallet.ensSuffix}
          </dd>
        </div>
      </dl>
    </article>
  )
}
