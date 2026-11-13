import { type Socket } from 'socket.io-client'

import {
  NFT_UPDATED,
  ORDER_UPDATED,
  WALLET_UPDATED,
  nftUpdatedEventSchema,
  orderUpdatedEventSchema,
  walletUpdatedEventSchema,
  type ClientToServerEvents,
  type RealtimeEvent,
  type ServerToClientEvents,
  type SocketAuth,
} from '@/contracts'
import { env } from '@/lib/env'
import { whenTransportReady } from '@/lib/http'
import { sessionStore } from '@/lib/session-store'
import { createStore } from '@/lib/storage'

import { createEventGuard, type GuardVerdict } from './event-guard'

/**
 * Socket.IO connection of the app.
 *
 * - One socket per session identity: when the session starts or ends the socket is
 *   torn down (listeners included) and a new one performs a fresh handshake with
 *   the new token. A frame from the previous session can therefore never reach the
 *   handlers of the next one.
 * - Every incoming event is validated against its schema, checked for ownership
 *   and passed through the event guard (duplicates / stale versions) before any
 *   subscriber sees it.
 * - Reconnection is handled by socket.io-client; subscribers are told when a
 *   connection comes back so they can reconcile through REST.
 * - `socket.io-client` is loaded on demand, after the transport is ready. Besides
 *   keeping it out of the critical bundle, this matters for the demo build:
 *   engine.io captures the global `WebSocket` when its module is evaluated, so it
 *   must be evaluated only after MSW has installed its WebSocket interception.
 */

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting'

type EventOf<Type extends RealtimeEvent['type']> = Extract<RealtimeEvent, { type: Type }>
type Handler<Type extends RealtimeEvent['type']> = (event: EventOf<Type>) => void

/** What happened to a frame — exposed for diagnostics and asserted by the tests. */
export interface FrameRecord {
  id: string
  type: string
  resource: string
  version: number
  verdict: GuardVerdict | 'invalid' | 'foreign'
}

const schemas = {
  [NFT_UPDATED]: nftUpdatedEventSchema,
  [ORDER_UPDATED]: orderUpdatedEventSchema,
  [WALLET_UPDATED]: walletUpdatedEventSchema,
} as const

type EventType = keyof typeof schemas
const FRAME_LOG_LIMIT = 100

function createRealtimeClient() {
  const status = createStore<ConnectionStatus>('idle')
  const guard = createEventGuard()
  const handlers = new Map<string, Set<(event: RealtimeEvent) => void>>()
  const reconnectListeners = new Set<() => void>()
  const frames: FrameRecord[] = []

  let socket: AppSocket | null = null
  let started = false
  /** True once the current socket has been connected at least once. */
  let hasConnected = false
  let unsubscribeSession: (() => void) | null = null

  function record(event: RealtimeEvent | null, raw: unknown, verdict: FrameRecord['verdict']) {
    const loose = (raw ?? {}) as { id?: unknown; type?: unknown; version?: unknown }
    frames.push({
      id: event?.id ?? String(loose.id ?? '?'),
      type: event?.type ?? String(loose.type ?? '?'),
      resource: event ? `${event.resource.type}:${event.resource.id}` : '?',
      version: event?.version ?? Number(loose.version ?? 0),
      verdict,
    })
    if (frames.length > FRAME_LOG_LIMIT) frames.shift()
  }

  function receive(type: EventType, raw: unknown): void {
    const parsed = schemas[type].safeParse(raw)
    if (!parsed.success) return record(null, raw, 'invalid')
    const event = parsed.data

    // Private events must belong to the user of the session that is on screen now.
    if ('userId' in event && event.userId !== sessionStore.getUserId()) {
      return record(event, raw, 'foreign')
    }

    const verdict = guard.check(event)
    record(event, raw, verdict)
    if (verdict !== 'accepted') return
    handlers.get(type)?.forEach((handler) => handler(event))
  }

  /** Bumped on every open/close so an in-flight open can tell it was superseded. */
  let generation = 0

  async function open(): Promise<void> {
    const current = ++generation
    hasConnected = false
    status.set('connecting')

    await whenTransportReady().catch(() => undefined)
    const { io } = await import('socket.io-client')
    if (!started || current !== generation) return

    const next: AppSocket = io(env.socketUrl || window.location.origin, {
      path: '/socket.io/',
      // WebSocket only: the simulated server does not implement long-polling.
      transports: ['websocket'],
      autoConnect: false,
      // Evaluated on every (re)connection attempt, so it always sends the current token.
      auth: (callback) => callback({ token: sessionStore.getToken() } satisfies SocketAuth),
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 4_000,
      randomizationFactor: 0,
    })
    socket = next

    next.on('connect', () => {
      const isReconnection = hasConnected
      hasConnected = true
      status.set('connected')
      // Events emitted while the socket was down are lost for good: reconcile.
      if (isReconnection) reconnectListeners.forEach((listener) => listener())
    })
    next.on('disconnect', () => status.set(hasConnected ? 'reconnecting' : 'connecting'))
    next.on('connect_error', () => status.set(hasConnected ? 'reconnecting' : 'connecting'))

    next.on(NFT_UPDATED, (payload) => receive(NFT_UPDATED, payload))
    next.on(ORDER_UPDATED, (payload) => receive(ORDER_UPDATED, payload))
    next.on(WALLET_UPDATED, (payload) => receive(WALLET_UPDATED, payload))

    next.connect()
  }

  function close(): void {
    generation += 1
    if (socket) {
      socket.removeAllListeners()
      socket.disconnect()
      socket = null
    }
    status.set('idle')
  }

  return {
    status,

    /** Opens the connection and keeps it bound to the session identity. */
    start(): void {
      if (started) return
      started = true
      let identity = sessionStore.getUserId()
      void open()
      unsubscribeSession = sessionStore.subscribe(() => {
        const nextIdentity = sessionStore.getUserId()
        if (nextIdentity === identity) return
        identity = nextIdentity
        // New identity → new socket, new handshake. Versions are per resource and
        // stay valid across users, so the guard is kept.
        close()
        void open()
      })
    },

    stop(): void {
      started = false
      unsubscribeSession?.()
      unsubscribeSession = null
      close()
    },

    on<Type extends RealtimeEvent['type']>(type: Type, handler: Handler<Type>): () => void {
      const set = handlers.get(type) ?? new Set()
      handlers.set(type, set)
      const wrapped = handler as (event: RealtimeEvent) => void
      set.add(wrapped)
      return () => {
        set.delete(wrapped)
      }
    },

    /** Called every time a dropped connection is re-established. */
    onReconnect(listener: () => void): () => void {
      reconnectListeners.add(listener)
      return () => {
        reconnectListeners.delete(listener)
      }
    },

    /** Feeds versions learned through REST into the guard. */
    observe: guard.observe,

    /** Verdict of the most recent frames, oldest first. */
    frames: (): FrameRecord[] => [...frames],
  }
}

export const realtime = createRealtimeClient()
