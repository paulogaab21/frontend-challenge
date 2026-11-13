import type { Session, User } from '@/contracts'
import { randomId } from '@/lib/storage'

import { mockConfig } from '../config'
import { db, type SessionRecord, type UserRecord } from '../db'
import { HttpProblem, problems } from './problem'

const PBKDF2_ITERATIONS = 10_000

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function fromHex(hex: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(new ArrayBuffer(hex.length / 2))
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = parseInt(hex.slice(index * 2, index * 2 + 2), 16)
  }
  return bytes
}

/**
 * Salted PBKDF2-SHA-256, the same derivation used to produce the fixtures. Only the
 * salt and the derived hash are ever stored (in memory and in localStorage).
 */
export async function hashPassword(password: string, saltHex: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(saltHex), iterations: PBKDF2_ITERATIONS },
    key,
    256,
  )
  return toHex(new Uint8Array(bits))
}

export function newSalt(): string {
  return toHex(crypto.getRandomValues(new Uint8Array(16)))
}

export async function verifyPassword(user: UserRecord, password: string): Promise<boolean> {
  return (await hashPassword(password, user.passwordSalt)) === user.passwordHash
}

export function toUser(record: UserRecord): User {
  return {
    id: record.id,
    email: record.email,
    username: record.username,
    displayName: record.displayName,
    avatarUrl: record.avatarUrl,
    createdAt: record.createdAt,
  }
}

export function findUserByEmail(email: string): UserRecord | undefined {
  const wanted = email.trim().toLowerCase()
  return Object.values(db.state.users).find((user) => user.email.toLowerCase() === wanted)
}

export function findUserByUsername(username: string): UserRecord | undefined {
  const wanted = username.trim().toLowerCase()
  return Object.values(db.state.users).find((user) => user.username.toLowerCase() === wanted)
}

export function createSession(user: UserRecord): Session {
  const now = Date.now()
  const record: SessionRecord = {
    token: `kst_${randomId().replace(/-/g, '')}`,
    userId: user.id,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + mockConfig.get().sessionTtlMs).toISOString(),
  }
  db.state.sessions[record.token] = record
  return { user: toUser(user), token: record.token, expiresAt: record.expiresAt }
}

export function endSession(token: string): void {
  delete db.state.sessions[token]
}

/** Ends every session of a user (or of everyone) — used by the mock controls. */
export function expireSessions(userId?: string): number {
  let ended = 0
  for (const session of Object.values(db.state.sessions)) {
    if (!userId || session.userId === userId) {
      delete db.state.sessions[session.token]
      ended += 1
    }
  }
  return ended
}

export function bearerToken(request: Request): string | null {
  const header = request.headers.get('Authorization')
  return header?.startsWith('Bearer ') ? header.slice(7).trim() || null : null
}

export interface AuthContext {
  user: UserRecord
  session: SessionRecord
}

/**
 * Resolves the session of a request.
 * - no token            → null (anonymous)
 * - unknown token       → 401 SESSION_EXPIRED (the session existed and is gone)
 * - token past its TTL  → 401 SESSION_EXPIRED
 */
export function authenticate(request: Request): AuthContext | null {
  const token = bearerToken(request)
  if (!token) return null
  return authenticateToken(token)
}

export function authenticateToken(token: string): AuthContext {
  const session = db.state.sessions[token]
  if (!session) throw problems.sessionExpired()
  if (Date.parse(session.expiresAt) <= Date.now()) {
    delete db.state.sessions[token]
    throw problems.sessionExpired()
  }
  const user = db.state.users[session.userId]
  if (!user) throw problems.sessionExpired()
  return { user, session }
}

export function requireAuth(request: Request): AuthContext {
  const context = authenticate(request)
  if (!context) throw problems.unauthenticated()
  return context
}

export function invalidCredentials(): HttpProblem {
  // One message for both cases: never reveal whether the e-mail is registered.
  return new HttpProblem(401, 'INVALID_CREDENTIALS', 'E-mail ou senha incorretos.', {
    fieldErrors: { password: ['E-mail ou senha incorretos.'] },
  })
}
