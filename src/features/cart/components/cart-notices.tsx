import { useId } from 'react'

import { AlertIcon, ArrowRightIcon } from '@/components/icons'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import type { QuoteIssue } from '@/contracts'
import { formatEth } from '@/lib/money'

export interface CartNoticesProps {
  changes: QuoteIssue[]
  blockers: QuoteIssue[]
  onAccept?: () => void
  acceptLabel?: string
}

export function CartNotices({
  changes,
  blockers,
  onAccept,
  acceptLabel = 'Entendi',
}: CartNoticesProps) {
  const id = useId()
  if (!changes.length && !blockers.length) return null
  return (
    <Alert role="region" aria-labelledby={`${id}-title`} className="border-line-strong">
      <AlertIcon className="text-amber" />
      <div className="min-w-0 space-y-3">
        <h2 id={`${id}-title`} className="text-base font-bold">
          {changes.length ? 'Seu carrinho foi atualizado' : 'Itens indisponíveis'}
        </h2>
        {changes.length > 0 && (
          <ul className="space-y-2 text-sm text-sand">
            {changes.map((issue, index) => (
              <li key={`${issue.type}-${issue.itemId ?? index}`}>
                <p>{issue.message}</p>
                {issue.type === 'price_changed' &&
                  issue.previous !== undefined &&
                  issue.current !== undefined && (
                    <p className="mt-1 flex flex-wrap items-center gap-2">
                      <span>{formatEth(issue.previous)}</span>
                      <ArrowRightIcon size={16} />
                      <span className="sr-only">para</span>
                      <strong className="text-amber">{formatEth(issue.current)}</strong>
                    </p>
                  )}
              </li>
            ))}
          </ul>
        )}
        {blockers.length > 0 && (
          <div>
            {changes.length > 0 && <h3 className="mb-2 font-bold">Itens indisponíveis</h3>}
            <ul className="list-inside list-disc space-y-2 text-sm text-sand">
              {blockers.map((issue, index) => (
                <li key={`${issue.type}-${issue.itemId ?? index}`}>{issue.message}</li>
              ))}
            </ul>
          </div>
        )}
        {onAccept && (
          <Button size="sm" onClick={onAccept}>
            {acceptLabel}
          </Button>
        )}
      </div>
    </Alert>
  )
}
