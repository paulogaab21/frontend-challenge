import { useQueryErrorResetBoundary } from '@tanstack/react-query'
import { useRouter, type ErrorComponentProps } from '@tanstack/react-router'
import { useEffect } from 'react'

import { SiteLink } from '@/components/layout/site-link'
import { Button } from '@/components/ui/button'
import { errorMessage } from '@/lib/http'

import { StatusPage } from './status-page'

/** Any address that matches no route. */
export function NotFoundPage() {
  return (
    <StatusPage
      eyebrow="Erro 404"
      title="Página não encontrada"
      description="O endereço que você abriu não existe ou foi movido. Volte ao mercado para continuar explorando."
      actions={
        <Button asChild>
          <SiteLink to="/">Voltar ao início</SiteLink>
        </Button>
      }
    />
  )
}

/** Last line of defence: an error thrown while rendering or loading a route. */
export function RouteErrorPage({ error, reset }: ErrorComponentProps) {
  const router = useRouter()
  const queryErrors = useQueryErrorResetBoundary()

  useEffect(() => {
    console.error('[kurio] Route error', error)
  }, [error])

  return (
    <StatusPage
      role="alert"
      eyebrow="Algo deu errado"
      title="Não foi possível exibir esta página"
      description={errorMessage(error, 'Ocorreu um erro inesperado. Tente novamente.')}
      actions={
        <>
          <Button
            onClick={() => {
              queryErrors.reset()
              reset()
              void router.invalidate()
            }}
          >
            Tentar novamente
          </Button>
          <Button variant="outline" asChild>
            <SiteLink to="/">Voltar ao início</SiteLink>
          </Button>
        </>
      }
    />
  )
}
