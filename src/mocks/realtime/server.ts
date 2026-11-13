import { toSocketIo } from '@mswjs/socket.io-binding'
import { ws, type WebSocketHandlerConnection } from 'msw'

import { type RealtimeEvent } from '@/contracts'
import { env } from '@/lib/env'

import { db } from '../db'
import { eventBus, type PublishOptions } from './bus'

/**
 * Socket.IO server simulated on top of MSW's WebSocket interception.
 *
 * Transport: the app's real `socket.io-client` opens a WebSocket (the client is
 * configured with `transports: ['websocket']`); MSW intercepts it in the page and
 * `@mswjs/socket.io-binding` encodes/decodes the Engine.IO + Socket.IO framing, so
 * every event goes through the client's own parser and reconnection logic.
 *
 * What the binding does not provide and is implemented here:
 * - handshake auth: the token of the CONNECT packet ("40{...}") is read by hand;
 * - heartbeat: the server must ping ("2") or the client closes after
 *   pingInterval + pingTimeout;
 * - routing: private events are delivered only to sockets of their owner.
 *
 * Not simulated: HTTP long-polling, namespaces other than "/", rooms, acks and
 * connection state recovery (missed events are *not* replayed — the client
 * reconciles through REST after reconnecting, as it would have to in production).
 */

const PING_INTERVAL_MS = 20_000

interface Client {
  id: number
  emit: (event: RealtimeEvent) => void
  close: () => void
  /** Token presented in the handshake; resolved to a user on every delivery. */
  token: string | null
  heartbeat: ReturnType<typeof setInterval>
}

const clients = new Map<number, Client>()
let nextClientId = 1
/** New connections are refused until this instant (simulated outage). */
let unreachableUntil = 0

const SOCKET_IO_PATH = '/socket.io/'

/**
 * MSW strips the `/socket.io/` prefix from the client URL before matching (so
 * handlers do not depend on that implementation detail), which means the link for a
 * Socket.IO endpoint is the *origin root*. Other WebSockets on the same origin (the
 * dev server's HMR channel) match it too and are passed through below.
 */
function socketLinkUrl(): string {
  const origin = env.socketUrl || window.location.origin
  return `${origin.replace(/^http/, 'ws')}/`
}

/** Reads the `auth` payload of the Socket.IO CONNECT packet: `40{"token":"..."}`. */
function parseHandshakeToken(raw: unknown): string | null | undefined {
  if (typeof raw !== 'string' || !raw.startsWith('40')) return undefined
  const json = raw.slice(raw.indexOf('{'))
  if (!json.startsWith('{')) return null
  try {
    const auth = JSON.parse(json) as { token?: unknown }
    return typeof auth.token === 'string' ? auth.token : null
  } catch {
    return null
  }
}

function userOf(client: Client): string | null {
  if (!client.token) return null
  const session = db.state.sessions[client.token]
  if (!session || Date.parse(session.expiresAt) <= Date.now()) return null
  return session.userId
}

function deliver(event: RealtimeEvent, options: PublishOptions): void {
  const owner = 'userId' in event ? event.userId : null
  for (const client of clients.values()) {
    if (owner === null || options.broadcast || userOf(client) === owner) {
      client.emit(event)
    }
  }
}

/**
 * Fails a connection attempt the way an unreachable server does in a browser: an
 * `error` event followed by an abnormal close. The error matters — while it is
 * still opening, socket.io-client only reacts to transport *errors*; a clean close
 * would leave its manager waiting for the 20 s connect timeout instead of backing
 * off and retrying.
 */
function refuse(connection: WebSocketHandlerConnection): void {
  const socket = (connection.client as { socket?: EventTarget }).socket
  if (socket) socket.dispatchEvent(new Event('error'))
  // Fallback for interceptor versions that do not expose the socket: an
  // undecodable Engine.IO frame is reported by the client as a transport error.
  else connection.client.send('unavailable')
  connection.client.close(1013, 'Realtime server unavailable')
}

function onConnection(connection: WebSocketHandlerConnection): void {
  if (!connection.client.url.pathname.startsWith(SOCKET_IO_PATH)) {
    // Not ours: let it reach the real server untouched.
    connection.server.connect()
    return
  }

  if (Date.now() < unreachableUntil) {
    refuse(connection)
    return
  }

  const io = toSocketIo(connection)
  const id = nextClientId++
  const client: Client = {
    id,
    token: null,
    emit: (event) => io.client.emit(event.type, event),
    close: () => connection.client.close(1012, 'Service restart'),
    heartbeat: setInterval(() => connection.client.send('2'), PING_INTERVAL_MS),
  }
  clients.set(id, client)

  connection.client.addEventListener('message', (message) => {
    const token = parseHandshakeToken(message.data)
    if (token !== undefined) client.token = token
  })

  connection.client.addEventListener('close', () => {
    clearInterval(client.heartbeat)
    clients.delete(id)
  })
}

export const realtimeHandlers = [
  ws.link(socketLinkUrl()).addEventListener('connection', onConnection),
]

let unsubscribe: (() => void) | null = null

export const realtimeServer = {
  start(): void {
    unsubscribe ??= eventBus.subscribe(deliver)
  },

  stop(): void {
    unsubscribe?.()
    unsubscribe = null
    this.disconnectAll()
  },

  connectedClients(): number {
    return clients.size
  },

  /** Closes every socket. Clients reconnect on their own unless an outage is active. */
  disconnectAll(): void {
    for (const client of [...clients.values()]) client.close()
  },

  /** Drops every socket and refuses new connections for `durationMs`. */
  startOutage(durationMs: number): void {
    unreachableUntil = Date.now() + durationMs
    this.disconnectAll()
  },

  endOutage(): void {
    unreachableUntil = 0
  },
}
