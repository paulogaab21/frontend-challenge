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
        // Small screens keep their bottom edge for the tab bar and the sticky purchase
        // bars, so there the trigger is an icon-only tab on the right edge; from md up
        // it is the labelled pill in the bottom-left corner.
        className="fixed top-1/2 right-0 z-50 flex size-11 -translate-y-1/2 items-center justify-center gap-2 rounded-l-full border border-r-0 border-line-strong bg-surface text-xs text-sand shadow-lg hover:text-cream md:top-auto md:right-auto md:bottom-4 md:left-4 md:size-auto md:min-h-11 md:max-w-[calc(100vw-2rem)] md:translate-y-0 md:rounded-full md:border-r md:px-4"
      >
        <Settings2 size={16} aria-hidden="true" className="shrink-0" />
        <span className="sr-only truncate md:not-sr-only">Mocks · {label ?? scenarioLabel()}</span>
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
