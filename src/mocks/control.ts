import type { EditionId, NetworkId, OrderDeclineReason, RealtimeEvent } from '@/contracts'
import { type EthAmount, isEthAmount } from '@/lib/money'

import { mockConfig, SCENARIOS, type FailureRule, type MockConfig, type Scenario } from './config'
import { db, type DbState } from './db'
import { expireSessions } from './domain/auth'
import { defaultEdition, findEdition, updateNft } from './domain/catalog'
import { resumeSettlements, settleOrder } from './domain/orders'
import { cancelAll } from './domain/timers'
import { dropConnectionsOf, resumeConnections } from './domain/wallets'
import { eventBus, type PublishOptions } from './realtime/bus'
import { realtimeServer } from './realtime/server'

/**
 * Operator console of the simulated backend, exposed as `window.__kurioMocks`.
 *
 * It plays the role of an admin API: it changes *server-side* state (scenario,
 * catalog, orders, sessions, connectivity). Nothing here touches the application —
 * the app only learns about a change through its own REST calls and through
 * Socket.IO frames delivered to `socket.io-client`.
 */
export interface MockControl {
  /* ---- scenarios ---- */
  scenarios: () => Scenario[]
  config: () => MockConfig
  /** Applies a scenario preset. `reset` also restores the seed data. */
  setScenario: (id: string, options?: { reset?: boolean }) => MockConfig
  /** Tweaks individual knobs on top of the active scenario. */
  configure: (patch: Partial<MockConfig>) => MockConfig
  /** Adds a one-off failure rule (e.g. fail the next PUT /favorites with 500). */
  failRequests: (rule: Omit<FailureRule, 'id'> & { id?: string }) => void
  clearFailures: () => void
  /** Restores the seed data and (by default) the default scenario. */
  reset: (options?: { scenario?: string }) => void

  /* ---- data changes: reflected by REST and announced through Socket.IO ---- */
  setPrice: (nftId: string, price: EthAmount, editionId?: EditionId) => void
  setAvailability: (nftId: string, available: number, editionId?: EditionId) => void
  setNetworkFee: (network: NetworkId, fee: EthAmount) => void
  settleOrder: (
    orderId: string,
    status: 'confirmed' | 'declined',
    reason?: OrderDeclineReason,
  ) => void
  /** Pending orders, oldest first. */
  pendingOrders: () => string[]

  /* ---- session / wallet / connectivity ---- */
  expireSessions: (userId?: string) => number
  disconnectWallet: (userId?: string) => void
  /** Closes every socket; clients reconnect immediately. */
  dropSockets: () => void
  /** Closes every socket and refuses reconnections for `durationMs`. */
  startSocketOutage: (durationMs: number) => void
  endSocketOutage: () => void
  connectedSockets: () => number

  /* ---- event stream tools ---- */
  /** Events published since the page loaded, oldest first. */
  events: () => RealtimeEvent[]
  /** Delivers a past event again, byte for byte (duplicate delivery). */
  redeliver: (eventId: string, options?: PublishOptions) => boolean
  /** Sends an arbitrary frame (e.g. an old version) through the socket server. */
  emit: (event: RealtimeEvent, options?: PublishOptions) => void

  /** Read-only copy of the database, for assertions and debugging. */
  snapshot: () => DbState
}

function requireEth(value: EthAmount): void {
  if (!isEthAmount(value)) throw new TypeError(`Invalid ETH amount: ${String(value)}`)
}

export function createMockControl(): MockControl {
  return {
    scenarios: () => SCENARIOS,
    config: () => mockConfig.get(),

    setScenario(id, options = {}) {
      const config = mockConfig.applyScenario(id)
      if (options.reset) this.reset({ scenario: id })
      return config
    },

    configure: (patch) => mockConfig.update(patch),

    failRequests(rule) {
      const current = mockConfig.get()
      const id = rule.id ?? `custom-${current.failures.length + 1}`
      mockConfig.update({ failures: [...current.failures, { ...rule, id }] })
    },

    clearFailures: () => {
      mockConfig.update({ failures: [] })
    },

    reset(options = {}) {
      cancelAll()
      realtimeServer.endOutage()
      eventBus.clear()
      mockConfig.applyScenario(options.scenario ?? 'default')
      db.reset()
      resumeSettlements()
      resumeConnections()
    },

    setPrice(nftId, price, editionId) {
      requireEth(price)
      updateNft(nftId, (nft) => {
        const edition = editionId ? findEdition(nft, editionId) : defaultEdition(nft)
        if (!edition) throw new Error(`Edition ${String(editionId)} not found on ${nftId}`)
        edition.price = price
      })
      db.save()
    },

    setAvailability(nftId, available, editionId) {
      if (!Number.isInteger(available) || available < 0) {
        throw new RangeError('Availability must be a non-negative integer')
      }
      updateNft(nftId, (nft) => {
        const edition = editionId ? findEdition(nft, editionId) : defaultEdition(nft)
        if (!edition) throw new Error(`Edition ${String(editionId)} not found on ${nftId}`)
        edition.available = available
      })
      db.save()
    },

    setNetworkFee(network, fee) {
      requireEth(fee)
      db.state.fees[network] = fee
      db.save()
    },

    settleOrder: (orderId, status, reason) => {
      settleOrder(orderId, status, reason)
    },

    pendingOrders: () =>
      Object.values(db.state.orders)
        .filter((order) => order.status === 'pending')
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map((order) => order.id),

    expireSessions(userId) {
      const ended = expireSessions(userId)
      db.save()
      return ended
    },

    disconnectWallet(userId) {
      const owners = userId
        ? [userId]
        : [...new Set(Object.values(db.state.connections).map((connection) => connection.userId))]
      owners.forEach(dropConnectionsOf)
    },

    dropSockets: () => realtimeServer.disconnectAll(),
    startSocketOutage: (durationMs) => realtimeServer.startOutage(durationMs),
    endSocketOutage: () => realtimeServer.endOutage(),
    connectedSockets: () => realtimeServer.connectedClients(),

    events: () => eventBus.history(),

    redeliver(eventId, options) {
      const event = eventBus.history().find((entry) => entry.id === eventId)
      if (!event) return false
      eventBus.redeliver(event, options)
      return true
    },

    emit: (event, options) => eventBus.redeliver(event, options),

    snapshot: () => structuredClone(db.state),
  }
}

declare global {
  interface Window {
    __kurioMocks?: MockControl
  }
}
