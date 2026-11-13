import { useState } from 'react'

import { AlertIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import {
  type Wallet,
  type WalletFields,
  type WalletFieldsInput,
  type WalletRole,
} from '@/contracts'
import { toFormFailure, type FormFailure } from '@/lib/form-errors'
import { errorMessage } from '@/lib/http'
import { notify } from '@/lib/notify'

import { AccountShell } from './account-shell'
import { WalletForm } from './components/wallet-form'
import { WalletSummary } from './components/wallet-summary'
import { WalletsListSkeleton } from './components/wallets-list-skeleton'
import { WalletsSection } from './components/wallets-section'
import { useCreateWallet, useUpdateWallet, useWallets } from './queries'

const ROLE_LABEL: Record<WalletRole, string> = {
  primary: 'Carteira principal',
  secondary: 'Carteira secundária',
}

/** The editable fields of a saved wallet, as the form expects them. */
function toFields(wallet: Wallet): WalletFieldsInput {
  return {
    displayName: wallet.displayName,
    nickname: wallet.nickname,
    network: wallet.network,
    profileName: wallet.profileName,
    address: wallet.address,
    secondaryAddress: wallet.secondaryAddress ?? '',
    provider: wallet.provider,
    referralCode: wallet.referralCode,
    email: wallet.email,
    ensName: wallet.ensName,
    ensSuffix: wallet.ensSuffix,
  }
}

/**
 * Primary and secondary wallets. A saved wallet is shown as a summary with
 * "Editar"; a missing one shows the form (primary) or an invitation to add it
 * (secondary). These are the wallets offered at checkout.
 */
export function WalletsPage() {
  const wallets = useWallets()
  const createWallet = useCreateWallet()
  const updateWallet = useUpdateWallet()
  const [editing, setEditing] = useState<WalletRole | null>(null)
  const [failure, setFailure] = useState<Partial<Record<WalletRole, FormFailure>>>({})
  /** "Igual à carteira principal" chosen before the secondary wallet exists. */
  const [mirrorDraft, setMirrorDraft] = useState(false)

  const primary = wallets.data?.items.find((wallet) => wallet.role === 'primary')
  const secondary = wallets.data?.items.find((wallet) => wallet.role === 'secondary')
  const pending = createWallet.isPending || updateWallet.isPending

  async function save(role: WalletRole, fields: WalletFields, sameAsPrimary?: boolean) {
    const existing = role === 'primary' ? primary : secondary
    setFailure((current) => ({ ...current, [role]: {} }))
    try {
      if (existing) {
        await updateWallet.mutateAsync({
          walletId: existing.id,
          input: { ...fields, sameAsPrimary },
        })
      } else {
        await createWallet.mutateAsync({ ...fields, role, sameAsPrimary })
      }
      setEditing(null)
      notify.success(`${ROLE_LABEL[role]} salva.`, { id: `wallet:${role}` })
    } catch (error) {
      setFailure((current) => ({ ...current, [role]: toFormFailure(error) }))
    }
  }

  /** Toggles "Igual à carteira principal" on a saved secondary wallet. */
  function mirror(checked: boolean) {
    if (!secondary) {
      setMirrorDraft(checked)
      return
    }
    if (!primary) return
    const source = checked ? primary : secondary
    updateWallet.mutate(
      {
        walletId: secondary.id,
        input: {
          ...toFields(source),
          secondaryAddress: source.secondaryAddress,
          sameAsPrimary: checked,
        },
      },
      {
        onSuccess: () =>
          notify.success(
            checked
              ? 'A carteira secundária agora é igual à principal.'
              : 'A carteira secundária deixou de espelhar a principal.',
            { id: 'wallet:secondary' },
          ),
        onError: (error) =>
          notify.error('Não foi possível atualizar a carteira secundária.', {
            id: 'wallet:secondary',
            description: errorMessage(error),
          }),
      },
    )
  }

  function toggle(role: WalletRole) {
    setFailure((current) => ({ ...current, [role]: {} }))
    setEditing((current) => (current === role ? null : role))
  }

  const showPrimaryForm = !primary || editing === 'primary'
  const showSecondaryForm = editing === 'secondary'
  const mirrored = secondary ? secondary.sameAsPrimary : mirrorDraft

  return (
    <AccountShell section="carteiras" title="Carteiras">
      <h1 className="sr-only">Carteiras</h1>
      {wallets.data ? (
        <>
          <WalletsSection
            walletRole="primary"
            actionLabel={primary ? 'Editar' : 'Adicionar'}
            // Without a primary wallet the form is already open: nothing to toggle.
            onAction={primary ? () => toggle('primary') : undefined}
            pending={pending}
          >
            {showPrimaryForm ? (
              <WalletForm
                key={`primary-${primary?.version ?? 'new'}`}
                defaultValues={primary ? toFields(primary) : undefined}
                onSubmit={(fields) => save('primary', fields)}
                onCancel={primary ? () => setEditing(null) : undefined}
                pending={pending}
                formError={failure.primary?.formError}
                fieldErrors={failure.primary?.fieldErrors}
              />
            ) : (
              primary && <WalletSummary wallet={primary} />
            )}
          </WalletsSection>

          <div className="mt-8">
            <WalletsSection
              walletRole="secondary"
              actionLabel={secondary ? 'Editar' : 'Adicionar'}
              onAction={() => toggle('secondary')}
              hasPrimary={Boolean(primary)}
              sameAsPrimary={mirrored}
              onSameAsPrimaryChange={mirror}
              pending={pending}
            >
              {showSecondaryForm ? (
                <WalletForm
                  key={`secondary-${secondary?.version ?? 'new'}-${mirrored}`}
                  defaultValues={
                    mirrored && primary
                      ? toFields(primary)
                      : secondary
                        ? toFields(secondary)
                        : undefined
                  }
                  onSubmit={(fields) => save('secondary', fields, mirrored)}
                  onCancel={() => setEditing(null)}
                  pending={pending}
                  formError={failure.secondary?.formError}
                  fieldErrors={failure.secondary?.fieldErrors}
                />
              ) : secondary ? (
                <WalletSummary wallet={secondary} />
              ) : null}
            </WalletsSection>
          </div>
        </>
      ) : wallets.isError ? (
        <div
          role="alert"
          className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-lg border border-coral p-6 text-center"
        >
          <AlertIcon size={32} className="text-coral" />
          <h2 className="text-xl font-bold">Não foi possível carregar suas carteiras</h2>
          <p className="max-w-md text-sand">{errorMessage(wallets.error)}</p>
          <Button onClick={() => void wallets.refetch()} loading={wallets.isFetching}>
            Tentar novamente
          </Button>
        </div>
      ) : (
        <WalletsListSkeleton form />
      )}
    </AccountShell>
  )
}
