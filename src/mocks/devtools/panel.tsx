import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { Controls } from './controls'
import { buttonClass } from './styles'

interface Props {
  id: string
  onClose: () => void
  onScenarioChange: (label: string) => void
}

/** The expensive operator UI lives in its own chunk and is mounted only while open. */
export function DevtoolsPanel({ id, onClose, onScenarioChange }: Props) {
  const closeButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeButton.current?.focus()
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', escape)
    return () => document.removeEventListener('keydown', escape)
  }, [onClose])

  return (
    <aside
      id={id}
      data-mock-devtools
      aria-labelledby={`${id}-title`}
      className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] left-3 z-[60] flex max-h-[calc(100dvh-7rem)] w-[calc(100vw-1.5rem)] max-w-[28rem] flex-col overflow-hidden rounded-lg border border-line-strong bg-surface text-xs text-cream shadow-2xl md:bottom-4 md:left-4 md:max-h-[calc(100dvh-2rem)]"
    >
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-line p-4">
        <div className="min-w-0 break-words">
          <p className="text-10 font-bold tracking-wider text-copper uppercase">
            Ambiente simulado
          </p>
          <h2 id={`${id}-title`} className="text-sm font-bold">
            Controles de demonstração
          </h2>
          <p className="mt-1 text-10 text-sand">Dados fictícios · Esc para fechar</p>
        </div>
        <button
          ref={closeButton}
          type="button"
          onClick={onClose}
          aria-label="Fechar controles de demonstração"
          className={`${buttonClass} shrink-0 px-3`}
        >
          <X size={16} aria-hidden="true" />
        </button>
      </header>
      {window.__kurioMocks ? (
        <Controls control={window.__kurioMocks} onScenarioChange={onScenarioChange} />
      ) : (
        <p role="status" className="p-4 text-sand">
          O ambiente simulado ainda está iniciando. Feche e abra os controles novamente.
        </p>
      )}
    </aside>
  )
}
