import type { RealtimeEvent } from '@/contracts'

/**
 * In-process bridge between the database (which decides *that* something changed)
 * and the Socket.IO simulation (which delivers it). Handlers never talk to sockets
 * directly: they mutate data, the domain publishes an event here.
 */

export interface PublishOptions {
  /**
   * Delivers a private event to every connected client instead of only to its
   * owner. Exists to reproduce a misrouted/late delivery in tests — the client must
   * still refuse it.
   */
  broadcast?: boolean
}

type Listener = (event: RealtimeEvent, options: PublishOptions) => void

const listeners = new Set<Listener>()
const log: RealtimeEvent[] = []
const LOG_LIMIT = 200

export const eventBus = {
  publish(event: RealtimeEvent, options: PublishOptions = {}): void {
    log.push(event)
    if (log.length > LOG_LIMIT) log.shift()
    listeners.forEach((listener) => listener(event, options))
  },

  /** Sends an event again exactly as it was (same id, same version). */
  redeliver(event: RealtimeEvent, options: PublishOptions = {}): void {
    listeners.forEach((listener) => listener(event, options))
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },

  /** Events published since the page loaded, oldest first. */
  history(): RealtimeEvent[] {
    return [...log]
  },

  clear(): void {
    log.length = 0
  },
}
