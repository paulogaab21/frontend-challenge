import { useRouter } from '@tanstack/react-router'
import { useState } from 'react'

import { Dialog, DialogContent } from '@/components/ui/dialog'
import { type LoginRequest, type RegisterFormValues } from '@/contracts'
import { HomePage } from '@/features/catalog/home-page'
import { errorMessage, isApiError } from '@/lib/http'
import { notify } from '@/lib/notify'
import { splitHref, stringifySearch } from '@/lib/search-params'
import { useDocumentTitle } from '@/lib/use-document-title'
import { useIsDesktop } from '@/lib/use-media-query'

import { AuthDialogLayout } from './components/auth-dialog-layout'
import { AuthPageLayout } from './components/auth-page-layout'
import { AuthSocialButtons } from './components/auth-social-buttons'
import { LoginForm } from './components/login-form'
import { RegisterForm } from './components/register-form'
import { useLogin, useRegister } from './session'

export interface AuthPageProps {
  mode: 'login' | 'register'
  /** Same-origin destination after authenticating (the flow that was interrupted). */
  redirectTo: string
  /** Why the collector was sent here, when it was not their own choice. */
  reason?: 'sessao-expirada'
}

interface Failure {
  formError?: string
  fieldErrors?: Record<string, string>
}

/** API errors that point at a field are shown next to it; the rest above the form. */
function toFailure(error: unknown): Failure {
  if (isApiError(error)) {
    const fieldErrors = Object.fromEntries(
      Object.entries(error.fieldErrors).flatMap(([field, messages]) =>
        messages[0] ? [[field, messages[0]]] : [],
      ),
    )
    if (Object.keys(fieldErrors).length > 0) return { fieldErrors }
  }
  return { formError: errorMessage(error) }
}

/**
 * Sign in / sign up. As in the Figma, desktop shows the form in a dialog over the
 * home page and mobile shows a page of its own. After authenticating, the
 * collector goes back to the flow they came from.
 */
export function AuthPage({ mode, redirectTo, reason }: AuthPageProps) {
  useDocumentTitle(mode === 'login' ? 'Entrar' : 'Criar conta')
  const router = useRouter()
  const desktop = useIsDesktop()
  const login = useLogin()
  const register = useRegister()
  const [failure, setFailure] = useState<Failure>({})
  const [notice, setNotice] = useState<string>()

  const carry = stringifySearch({ redirect: redirectTo === '/' ? undefined : redirectTo })
  const links = { loginTo: `/entrar${carry}`, registerTo: `/cadastro${carry}` }

  function leave(replace: boolean) {
    const { to, search, hash } = splitHref(redirectTo)
    void router.navigate({ to, search, hash, replace })
  }

  async function submitLogin(values: LoginRequest) {
    setFailure({})
    try {
      const session = await login.mutateAsync(values)
      notify.success(`Olá, ${session.user.displayName}! Você entrou na sua conta.`, {
        id: 'session',
      })
      leave(true)
    } catch (error) {
      setFailure(toFailure(error))
    }
  }

  async function submitRegister({ username, email, password }: RegisterFormValues) {
    setFailure({})
    try {
      await register.mutateAsync({ username, email, password })
      notify.success('Conta criada. Boas-vindas à Kurio!', { id: 'session' })
      leave(true)
    } catch (error) {
      setFailure(toFailure(error))
    }
  }

  const pending = login.isPending || register.isPending
  const formError =
    failure.formError ??
    (reason === 'sessao-expirada' && !failure.fieldErrors
      ? 'Sua sessão expirou. Entre novamente para continuar de onde parou.'
      : undefined)

  const form =
    mode === 'login' ? (
      <LoginForm
        onSubmit={submitLogin}
        pending={pending}
        formError={formError}
        fieldErrors={failure.fieldErrors}
        onForgotPassword={() =>
          setNotice('A recuperação de senha não faz parte desta demonstração.')
        }
      />
    ) : (
      <RegisterForm
        onSubmit={submitRegister}
        pending={pending}
        formError={formError}
        fieldErrors={failure.fieldErrors}
      />
    )

  const social = (
    <AuthSocialButtons
      mode={mode}
      disabled={pending}
      notice={notice}
      // Out of scope: explain it instead of simulating a provider sign-in.
      onSelect={() =>
        setNotice('O login social não faz parte desta demonstração. Use seu e-mail e senha.')
      }
    />
  )

  if (!desktop) {
    return (
      <main id="conteudo" className="min-h-dvh">
        <AuthPageLayout mode={mode} {...links} social={social}>
          {form}
        </AuthPageLayout>
      </main>
    )
  }

  return (
    <>
      <HomePage search={{}} />
      <Dialog
        open
        onOpenChange={(open) => {
          // Closing the dialog abandons the sign-in: back to the catalog.
          if (!open) void router.navigate({ to: '/' })
        }}
      >
        <DialogContent className="gap-0 p-0">
          <AuthDialogLayout mode={mode} {...links} social={social}>
            {form}
          </AuthDialogLayout>
        </DialogContent>
      </Dialog>
    </>
  )
}
