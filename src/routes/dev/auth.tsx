import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { PageShell } from '@/components/layout/page-shell'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AuthDialogLayout } from '@/features/auth/components/auth-dialog-layout'
import { AuthPageLayout } from '@/features/auth/components/auth-page-layout'
import { AuthSocialButtons } from '@/features/auth/components/auth-social-buttons'
import { LoginForm } from '@/features/auth/components/login-form'
import { RegisterForm } from '@/features/auth/components/register-form'
import { AuthFormSkeleton } from '@/features/auth/components/auth-form-skeleton'
import { HeroCarousel } from '@/features/catalog/components/hero-carousel'
import { CatalogFilters } from '@/features/catalog/components/catalog-filters'
import { NftGrid } from '@/features/catalog/components/nft-grid'
import { sampleSlides, sampleFacets, sampleCards, nftHref } from './_sample'
import { ShowcaseControls } from './-showcase-controls'
import { useDesktop } from './-use-desktop'
export const Route = createFileRoute('/dev/auth')({ component: AuthShowcase })
function AuthShowcase() {
  const desktop = useDesktop()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [open, setOpen] = useState(true)
  const [state, setState] = useState<'ready' | 'pending' | 'error' | 'fields' | 'loading'>('ready')
  const [notice, setNotice] = useState<string>()
  const [submission, setSubmission] = useState<string>()
  const social = (
    <AuthSocialButtons
      mode={mode}
      onSelect={() =>
        setNotice('O login social não está disponível neste desafio. Use seu e-mail e senha.')
      }
      notice={notice}
      disabled={state === 'pending'}
    />
  )
  const props = {
    pending: state === 'pending',
    formError:
      state === 'error'
        ? 'Não foi possível continuar. Verifique seus dados e tente novamente.'
        : undefined,
    fieldErrors: state === 'fields' ? { email: 'Este e-mail já está em uso.' } : undefined,
  }
  const form =
    state === 'loading' ? (
      <AuthFormSkeleton mode={mode} />
    ) : mode === 'login' ? (
      <LoginForm
        {...props}
        onSubmit={() =>
          setSubmission('Formulário validado. Nenhum dado foi enviado nesta demonstração.')
        }
        onForgotPassword={() =>
          setNotice('A recuperação de senha não está disponível neste desafio.')
        }
      />
    ) : (
      <RegisterForm
        {...props}
        onSubmit={() =>
          setSubmission('Formulário validado. Nenhuma conta foi criada nesta demonstração.')
        }
      />
    )
  const links = { loginTo: '/dev/auth', registerTo: '/dev/auth#cadastro' }
  return (
    <div
      onClickCapture={(event) => {
        const anchor = (event.target as HTMLElement).closest('a')
        if (
          anchor?.getAttribute('href') === links.loginTo ||
          anchor?.getAttribute('href') === links.registerTo
        ) {
          event.preventDefault()
          setMode(anchor.getAttribute('href') === links.registerTo ? 'register' : 'login')
          setState('ready')
          setNotice(undefined)
        }
      }}
    >
      <PageShell
        header={{ divider: true, cartCount: 6 }}
        mobileTopBar={false}
        mobileTabBar={false}
        footer={false}
      >
        {desktop ? (
          <>
            <div className="container-page mt-8">
              <HeroCarousel slides={sampleSlides} />
              <div className="mt-6 grid grid-cols-[310px_minmax(0,1fr)] gap-12">
                <CatalogFilters
                  facets={sampleFacets}
                  value={{ category: [], network: [] }}
                  onChange={() => undefined}
                  onClear={() => undefined}
                />
                <NftGrid items={sampleCards} getHref={nftHref} isFavorite={() => false} />
              </div>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogContent className="gap-0 p-0">
                <AuthDialogLayout mode={mode} {...links} social={social}>
                  {form}
                </AuthDialogLayout>
              </DialogContent>
            </Dialog>
          </>
        ) : (
          <AuthPageLayout mode={mode} {...links} social={social}>
            {form}
          </AuthPageLayout>
        )}
        <ShowcaseControls>
          <Button
            onClick={() => {
              setOpen(true)
              setMode(mode === 'login' ? 'register' : 'login')
              setState('ready')
            }}
          >
            {mode === 'login' ? 'Ver cadastro' : 'Ver login'}
          </Button>
          <Button onClick={() => setOpen(true)}>Abrir painel</Button>
          {(['ready', 'pending', 'error', 'fields', 'loading'] as const).map((item, i) => (
            <Button
              key={item}
              variant="outline"
              aria-pressed={state === item}
              onClick={() => {
                setState(item)
                setOpen(true)
              }}
            >
              {['Pronto', 'Pendente', 'Erro', 'Erro no campo', 'Carregando'][i]}
            </Button>
          ))}
          <p role="status" className="basis-full text-sand">
            {submission}
          </p>
        </ShowcaseControls>
      </PageShell>
    </div>
  )
}
