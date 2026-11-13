import { setupWorker } from 'msw/browser'

import { findScenario, mockConfig } from './config'
import { createMockControl, type MockControl } from './control'
import { db } from './db'
import { resumeSettlements } from './domain/orders'
import { resumeConnections } from './domain/wallets'
import { handlers } from './handlers'
import { realtimeServer } from './realtime/server'

/**
 * Boots the simulated backend in the browser: REST through the MSW service worker,
 * Socket.IO through MSW's WebSocket interception. Called once by the bootstrap when
 * `VITE_ENABLE_MOCKS=true`; the module is a separate chunk, so a build pointed at a
 * real backend never downloads it.
 *
 * Query string switches (handy for demos and bug reports):
 *   ?scenario=<id>   applies a scenario preset
 *   ?reset           restores the seed data (combine with scenario for a known state)
 */
function applyUrlSwitches(control: MockControl): void {
  const url = new URL(window.location.href)
  const scenario = url.searchParams.get('scenario')
  const reset = url.searchParams.has('reset')
  if (!scenario && !reset) return

  if (reset) control.reset({ scenario: scenario && findScenario(scenario) ? scenario : undefined })
  else if (scenario && findScenario(scenario)) control.setScenario(scenario)

  // Drop the switches so a refresh does not re-apply them and links stay clean.
  url.searchParams.delete('scenario')
  url.searchParams.delete('reset')
  window.history.replaceState(window.history.state, '', url)
}

export async function startMockServer(): Promise<MockControl> {
  const control = createMockControl()
  window.__kurioMocks = control
  applyUrlSwitches(control)

  const worker = setupWorker(...handlers)
  await worker.start({
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
    // Static assets, fonts and the dev server's own requests pass straight through.
    onUnhandledRequest: 'bypass',
    quiet: true,
  })

  realtimeServer.start()
  // Orders and wallet connections that were mid-flight before a reload carry on.
  resumeSettlements()
  resumeConnections()
  db.save()

  if (import.meta.env.DEV) {
    console.info(
      `[mocks] Simulated backend ready — scenario "${mockConfig.get().scenario}". Controls: window.__kurioMocks`,
    )
  }
  return control
}
