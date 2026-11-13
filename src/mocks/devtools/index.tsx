import { Settings2 } from 'lucide-react'
import { lazy, Suspense, useCallback, useId, useRef, useState } from 'react'

const Panel = lazy(() =>
  import('./panel').then(({ DevtoolsPanel }) => ({ default: DevtoolsPanel })),
)

function scenarioLabel(): string {
  const control = window.__kurioMocks
  if (!control) return 'Inicializando'
  const id = control.config().scenario
  return control.scenarios().find((scenario) => scenario.id === id)?.label ?? id
}

/** Mount through React.lazy only when mocks are enabled. No polling while collapsed. */
export function MockDevtools() {
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState<string | null>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  const close = useCallback(() => {
    setOpen(false)
    trigger.current?.focus()
  }, [])

  return (
    <div data-mock-devtools className="font-mono text-xs">
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] left-3 z-50 flex min-h-11 max-w-[calc(100vw-1.5rem)] items-center gap-2 rounded-full border border-line-strong bg-surface px-4 text-xs text-sand shadow-lg hover:text-cream md:bottom-4 md:left-4"
      >
        <Settings2 size={16} aria-hidden="true" className="shrink-0" />
        <span className="truncate">Mocks · {label ?? scenarioLabel()}</span>
      </button>
      {open && (
        <Suspense
          fallback={
            <div
              role="status"
              className="fixed bottom-[calc(env(safe-area-inset-bottom)+8.5rem)] left-3 z-[60] rounded-lg border border-line bg-surface p-3 text-sand md:bottom-20"
            >
              Carregando controles…
            </div>
          }
        >
          <Panel id={panelId} onClose={close} onScenarioChange={setLabel} />
        </Suspense>
      )}
    </div>
  )
}
