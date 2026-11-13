import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { PageShell } from '@/components/layout/page-shell'
import { Button } from '@/components/ui/button'
import { AccountLayout } from '@/features/account/components/account-layout'
import { ProfileForm } from '@/features/account/components/profile-form'
import { PasswordForm } from '@/features/account/components/password-form'
import { AvatarField } from '@/features/account/components/avatar-field'
import { WalletForm } from '@/features/account/components/wallet-form'
import { WalletSummary } from '@/features/account/components/wallet-summary'
import { WalletsSection } from '@/features/account/components/wallets-section'
import { ProfileFormSkeleton } from '@/features/account/components/profile-form-skeleton'
import { WalletsListSkeleton } from '@/features/account/components/wallets-list-skeleton'
import { sampleProfile, sampleWallets } from './_sample'
import { ShowcaseControls } from './-showcase-controls'
export const Route = createFileRoute('/dev/account')({ component: AccountShowcase })
function AccountShowcase() {
  const [section, setSection] = useState<'profile' | 'wallets'>('profile')
  const [state, setState] = useState<
    'ready' | 'pending' | 'error' | 'fields' | 'loading' | 'saved' | 'empty'
  >('ready')
  const [same, setSame] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [message, setMessage] = useState<string>()
  const [passwordSuccess, setPasswordSuccess] = useState<string>()
  const [avatarError, setAvatarError] = useState<string>()
  const [editSecondary, setEditSecondary] = useState(false)
  const feedback = {
    pending: state === 'pending',
    formError: state === 'error' ? 'Não foi possível salvar. Tente novamente.' : undefined,
    fieldErrors:
      state === 'fields'
        ? {
            email: 'Este e-mail já está em uso.',
            username: 'Este nome de usuário não está disponível.',
          }
        : undefined,
  }
  const onSubmit = () =>
    setMessage('Formulário validado. Nenhuma alteração foi enviada nesta demonstração.')
  const primary = sampleWallets[0]!
  return (
    <PageShell
      header={{ divider: true, user: { displayName: sampleProfile.displayName } }}
      mobileTopBar={{ variant: 'inner', title: 'Meu perfil', backTo: '/dev/catalog' }}
      mobileTabBar={{ activeTab: 'perfil' }}
      footer={false}
    >
      <div
        className="container-page mt-8"
        onClickCapture={(event) => {
          const anchor = (event.target as HTMLElement).closest('a')
          const to = anchor?.getAttribute('href')
          if (to === '/dev/account' || to === '/dev/account#carteiras') {
            event.preventDefault()
            setSection(to.endsWith('#carteiras') ? 'wallets' : 'profile')
          }
        }}
      >
        <AccountLayout
          active={section === 'profile' ? 'perfil' : 'carteiras'}
          items={[
            { id: 'perfil', label: 'Dados do perfil', to: '/dev/account', icon: UserIcon },
            {
              id: 'carteiras',
              label: 'Carteiras',
              to: '/dev/account#carteiras',
              icon: LocationIcon,
            },
            { id: 'atividade', label: 'Atividade', to: '/em-breve/atividade', icon: ShoppingIcon },
            {
              id: 'favoritos',
              label: 'Lista de interesse',
              to: '/conta/favoritos',
              icon: HeartIcon,
            },
            { id: 'ofertas', label: 'Ofertas', to: '/em-breve/ofertas', icon: ActivityIcon },
            {
              id: 'downloads',
              label: 'Arquivos baixados',
              to: '/em-breve/downloads',
              icon: DownloadIcon,
            },
            { id: 'suporte', label: 'Suporte', to: '/em-breve/suporte', icon: DangerTriangleIcon },
          ]}
          onLogout={() => setMessage('Sair selecionado. Esta demonstração não altera a sessão.')}
        >
          <div
            onClickCapture={(event) => {
              const anchor = (event.target as HTMLElement).closest('a')
              if (anchor?.getAttribute('href') === '/dev/account#carteiras') {
                event.preventDefault()
                setSection('wallets')
              }
            }}
          >
            {section === 'profile' ? (
              state === 'loading' ? (
                <ProfileFormSkeleton />
              ) : (
                <>
                  <ProfileForm
                    {...feedback}
                    defaultValues={sampleProfile}
                    onSubmit={onSubmit}
                    avatarField={
                      <AvatarField
                        avatarUrl={avatarUrl}
                        displayName={sampleProfile.displayName}
                        pending={feedback.pending}
                        onSelect={(file) => {
                          setAvatarError(undefined)
                          const reader = new FileReader()
                          reader.onload = () => {
                            if (typeof reader.result === 'string') setAvatarUrl(reader.result)
                          }
                          reader.readAsDataURL(file)
                        }}
                        onRemove={() => setAvatarUrl(null)}
                        error={avatarError}
                        onValidationError={setAvatarError}
                      />
                    }
                  />
                  <div className="mt-8">
                    <PasswordForm
                      {...feedback}
                      onSubmit={onSubmit}
                      successMessage={passwordSuccess}
                    />
                  </div>
                </>
              )
            ) : state === 'loading' ? (
              <WalletsListSkeleton form />
            ) : (
              <>
                <h1 className="sr-only">Carteiras</h1>
                <WalletsSection
                  walletRole="primary"
                  onAction={() => setState(state === 'saved' ? 'ready' : 'saved')}
                  actionLabel={state === 'saved' ? 'Editar' : 'Adicionar'}
                >
                  {state === 'saved' ? (
                    <WalletSummary wallet={primary} onEdit={() => setState('ready')} />
                  ) : state !== 'empty' ? (
                    <WalletForm {...feedback} onSubmit={onSubmit} />
                  ) : (
                    <p className="text-sand">Você ainda não adicionou uma carteira principal.</p>
                  )}
                </WalletsSection>
                <div className="mt-8">
                  <WalletsSection
                    walletRole="secondary"
                    hasPrimary={state !== 'empty'}
                    sameAsPrimary={same}
                    onSameAsPrimaryChange={setSame}
                    onAction={() => setEditSecondary((prev) => !prev)}
                  >
                    {editSecondary ? (
                      <WalletForm
                        {...feedback}
                        defaultValues={same ? primary : undefined}
                        onSubmit={onSubmit}
                        onCancel={() => setEditSecondary(false)}
                      />
                    ) : same && state !== 'empty' ? (
                      <WalletSummary wallet={{ ...primary, id: 'secondary', role: 'secondary' }} />
                    ) : null}
                  </WalletsSection>
                </div>
              </>
            )}
          </div>
        </AccountLayout>
      </div>
      <ShowcaseControls>
        <Button
          variant="outline"
          onClick={() => setSection(section === 'profile' ? 'wallets' : 'profile')}
        >
          {section === 'profile' ? 'Ver carteiras' : 'Ver perfil'}
        </Button>
        {(['ready', 'pending', 'error', 'fields', 'loading', 'saved', 'empty'] as const).map(
          (item, i) => (
            <Button
              key={item}
              variant="outline"
              onClick={() => setState(item)}
              aria-pressed={state === item}
            >
              {
                [
                  'Pronto',
                  'Pendente',
                  'Erro',
                  'Erro nos campos',
                  'Carregando',
                  'Carteira salva',
                  'Sem carteiras',
                ][i]
              }
            </Button>
          ),
        )}
        <Button
          variant="outline"
          onClick={() =>
            setPasswordSuccess(`Senha alterada — estado fornecido pelo pai (${Date.now()}).`)
          }
        >
          Demonstrar confirmação da senha
        </Button>
        <p role="status" className="basis-full text-sand">
          {message}
        </p>
      </ShowcaseControls>
    </PageShell>
  )
}
import {
  UserIcon,
  LocationIcon,
  ShoppingIcon,
  HeartIcon,
  ActivityIcon,
  DownloadIcon,
  DangerTriangleIcon,
} from '@/components/icons'
