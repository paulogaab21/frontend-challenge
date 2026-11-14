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
        // Small screens have no free corner: the bottom edge belongs to the tab bar
        // and the purchase bars, and every page has controls near both sides. There
        // the trigger is a 24px-wide handle that lives entirely inside the page
        // gutter (24–28px), so it can never cover a control. From md up it is the
        // labelled pill in the bottom-left corner.
        className="fixed top-1/2 right-0 z-50 flex h-16 w-6 -translate-y-1/2 items-center justify-center gap-2 rounded-l-md border border-r-0 border-line-strong bg-surface text-xs text-sand shadow-lg hover:text-cream md:top-auto md:right-auto md:bottom-4 md:left-4 md:h-auto md:min-h-11 md:w-auto md:max-w-[calc(100vw-2rem)] md:translate-y-0 md:rounded-full md:border-r md:px-4"
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
