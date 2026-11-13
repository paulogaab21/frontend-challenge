import { useQuery } from '@tanstack/react-query'

import { AppShell } from '@/app/app-shell'
import { AlertIcon } from '@/components/icons'
import { SiteLink } from '@/components/layout/site-link'
import { Button } from '@/components/ui/button'
import { useSession } from '@/features/auth/session'
import { errorMessage, isApiError } from '@/lib/http'
import { useDocumentTitle } from '@/lib/use-document-title'

import { TransactionDetails } from './components/transaction-details'
import { TransactionDetailsSkeleton } from './components/transaction-details-skeleton'
import { transactionQueryOptions } from './queries'

export interface TransactionPageProps {
  hash: string
}

/**
 * The "explorer" a receipt links to. It is part of the simulation — an in-app page
 * that says so — instead of a link to a real block explorer, where a made-up hash
 * would lead nowhere.
 */
export function TransactionPage({ hash }: TransactionPageProps) {
  useDocumentTitle('Transação (simulada)')
  const { scope } = useSession()
  const transaction = useQuery(transactionQueryOptions(scope, hash))

  return (
    <AppShell
      mobileTab={false}
      mobileTopBar={{ variant: 'inner', title: 'Transação', backTo: '/' }}
    >
      <div className="container-page py-6 md:py-12">
        {transaction.data ? (
          <TransactionDetails
            transaction={transaction.data}
            orderTo={`/pedido/${transaction.data.orderId}`}
          />
        ) : transaction.isError ? (
          <section
            role="alert"
            className="mx-auto flex max-w-[780px] flex-col items-center gap-4 rounded-lg border border-coral bg-surface p-8 text-center"
          >
            <AlertIcon size={32} className="text-coral" />
            <h1 className="text-xl font-bold">
              {isApiError(transaction.error, 'NOT_FOUND')
                ? 'Transação não encontrada'
                : isApiError(transaction.error, 'FORBIDDEN')
                  ? 'Esta transação pertence a outra conta'
                  : 'Não foi possível carregar a transação'}
            </h1>
            <p className="text-sm text-sand">{errorMessage(transaction.error)}</p>
            <div className="flex flex-wrap justify-center gap-3">
              {!isApiError(transaction.error, ['NOT_FOUND', 'FORBIDDEN']) && (
                <Button onClick={() => void transaction.refetch()} loading={transaction.isFetching}>
                  Tentar novamente
                </Button>
              )}
              <Button variant="outline" asChild>
                <SiteLink to="/">Voltar ao início</SiteLink>
              </Button>
            </div>
          </section>
        ) : (
          <TransactionDetailsSkeleton />
        )}
      </div>
    </AppShell>
  )
}
