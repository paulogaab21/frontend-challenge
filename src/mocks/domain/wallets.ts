import {
  WALLET_UPDATED,
  type NetworkId,
  type Wallet,
  type WalletConnection,
  type WalletFields,
  type WalletProvider,
  type WalletRole,
} from '@/contracts'

import { mockConfig } from '../config'
import { db, type ConnectionRecord, type WalletRecord } from '../db'
import { eventBus } from '../realtime/bus'
import { nextEvent } from './events'
import { HttpProblem, problems } from './problem'
import { schedule } from './timers'

export function toWallet(record: WalletRecord): Wallet {
  const { userId: _userId, ...wallet } = record
  return wallet
}

export function listWallets(userId: string): WalletRecord[] {
  return Object.values(db.state.wallets)
    .filter((wallet) => wallet.userId === userId)
    .sort((a, b) => (a.role === b.role ? 0 : a.role === 'primary' ? -1 : 1))
}

export function findWallet(userId: string, walletId: string): WalletRecord {
  const wallet = db.state.wallets[walletId]
  if (!wallet) throw problems.notFound('Carteira não encontrada.')
  if (wallet.userId !== userId) throw problems.forbidden('Esta carteira pertence a outra conta.')
  return wallet
}

function assertAddressFree(userId: string, address: string, ignoreId?: string): void {
  const taken = Object.values(db.state.wallets).some(
    (wallet) =>
      wallet.userId !== userId &&
      wallet.id !== ignoreId &&
      wallet.address.toLowerCase() === address.toLowerCase(),
  )
  if (taken) {
    const message = 'Este endereço já está vinculado a outra conta.'
    throw new HttpProblem(409, 'WALLET_ADDRESS_TAKEN', message, {
      fieldErrors: { address: [message] },
    })
  }
}

export function createWallet(
  userId: string,
  role: WalletRole,
  fields: WalletFields,
  sameAsPrimary = false,
): WalletRecord {
  if (listWallets(userId).some((wallet) => wallet.role === role)) {
    throw problems.conflict(
      'WALLET_ROLE_TAKEN',
      role === 'primary'
        ? 'Você já tem uma carteira principal. Edite a carteira existente.'
        : 'Você já tem uma carteira secundária. Edite a carteira existente.',
    )
  }
  assertAddressFree(userId, fields.address)
  const now = new Date().toISOString()
  const wallet: WalletRecord = {
    ...fields,
    id: `wal_${String(db.nextId('wallet')).padStart(4, '0')}`,
    userId,
    role,
    sameAsPrimary: role === 'secondary' && sameAsPrimary,
    createdAt: now,
    updatedAt: now,
    version: 1,
  }
  db.state.wallets[wallet.id] = wallet
  return wallet
}

export function updateWallet(
  userId: string,
  walletId: string,
  fields: WalletFields,
  sameAsPrimary?: boolean,
): WalletRecord {
  const wallet = findWallet(userId, walletId)
  assertAddressFree(userId, fields.address, wallet.id)
  Object.assign(wallet, fields)
  if (sameAsPrimary !== undefined)
    wallet.sameAsPrimary = wallet.role === 'secondary' && sameAsPrimary
  wallet.updatedAt = new Date().toISOString()
  wallet.version += 1
  return wallet
}

/* -------------------------------------------------------------------------- */
/* Connection simulation                                                      */
/* -------------------------------------------------------------------------- */

export function toConnection(record: ConnectionRecord): WalletConnection {
  const { userId: _userId, dropAt: _dropAt, ...connection } = record
  return connection
}

export function activeConnection(userId: string): ConnectionRecord | null {
  return (
    Object.values(db.state.connections)
      .filter((connection) => connection.userId === userId && connection.status === 'connected')
      .at(-1) ?? null
  )
}

function publishConnection(record: ConnectionRecord): void {
  eventBus.publish({
    ...nextEvent(`wallet-connection:${record.id}`, record.version),
    type: WALLET_UPDATED,
    resource: { type: 'wallet-connection', id: record.id },
    userId: record.userId,
    data: { connectionId: record.id, walletId: record.walletId, status: record.status },
  })
}

/** Marks a connection as dropped and tells its owner through the realtime channel. */
export function dropConnection(connectionId: string): void {
  const record = db.state.connections[connectionId]
  if (!record || record.status === 'disconnected') return
  record.status = 'disconnected'
  record.version += 1
  record.dropAt = null
  publishConnection(record)
  db.save()
}

export function dropConnectionsOf(userId: string): void {
  for (const record of Object.values(db.state.connections)) {
    if (record.userId === userId) dropConnection(record.id)
  }
}

/**
 * Simulates the wallet prompt. Depending on the scenario the wallet approves the
 * connection, refuses it, or approves and drops it a few seconds later.
 */
export function connectWallet(
  userId: string,
  walletId: string | null,
  address: string,
  provider: WalletProvider,
  network: NetworkId,
): ConnectionRecord {
  const config = mockConfig.get()
  if (config.walletConnection === 'reject') {
    throw new HttpProblem(
      403,
      'WALLET_CONNECTION_REJECTED',
      'A solicitação de conexão foi recusada na carteira.',
    )
  }

  // One live connection per user: a new one supersedes the previous.
  for (const previous of Object.values(db.state.connections)) {
    if (previous.userId === userId && previous.status === 'connected') {
      previous.status = 'disconnected'
      previous.version += 1
      previous.dropAt = null
    }
  }

  const now = Date.now()
  const record: ConnectionRecord = {
    id: `con_${String(db.nextId('connection')).padStart(4, '0')}`,
    userId,
    walletId,
    provider,
    network,
    address,
    status: 'connected',
    connectedAt: new Date(now).toISOString(),
    version: 1,
    dropAt: config.walletDisconnectAfterMs === null ? null : now + config.walletDisconnectAfterMs,
  }
  db.state.connections[record.id] = record
  scheduleConnectionDrop(record)
  return record
}

function scheduleConnectionDrop(record: ConnectionRecord): void {
  if (record.dropAt === null || record.status !== 'connected') return
  schedule(`connection:${record.id}`, record.dropAt, () => dropConnection(record.id))
}

/** Re-arms the timers of connections that were live when the page reloaded. */
export function resumeConnections(): void {
  Object.values(db.state.connections).forEach(scheduleConnectionDrop)
}
