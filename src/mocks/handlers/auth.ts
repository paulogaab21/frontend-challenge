import { loginRequestSchema, registerRequestSchema } from '@/contracts'

import { db, type UserRecord } from '../db'
import {
  bearerToken,
  createSession,
  endSession,
  findUserByEmail,
  findUserByUsername,
  hashPassword,
  invalidCredentials,
  newSalt,
  toUser,
  verifyPassword,
} from '../domain/auth'
import { mergeGuestCart } from '../domain/cart'
import { HttpProblem } from '../domain/problem'
import { CART_TOKEN_HEADER, noContent, route } from './route'

function conflict(code: 'EMAIL_TAKEN' | 'USERNAME_TAKEN', field: string, message: string) {
  return new HttpProblem(409, code, message, { fieldErrors: { [field]: [message] } })
}

/** The visitor's cart follows them into the account when a session starts. */
function adoptGuestCart(request: Request, userId: string): void {
  const guestToken = request.headers.get(CART_TOKEN_HEADER)
  if (guestToken) mergeGuestCart(`guest:${guestToken}`, `user:${userId}`)
}

export const authHandlers = [
  /** Sign up. 409 EMAIL_TAKEN / USERNAME_TAKEN on conflict. */
  route(
    'POST',
    '/users',
    async ({ request, body }) => {
      const input = await body(registerRequestSchema)
      const email = input.email.toLowerCase()

      if (findUserByEmail(email)) {
        throw conflict('EMAIL_TAKEN', 'email', 'Já existe uma conta com este e-mail.')
      }
      if (findUserByUsername(input.username)) {
        throw conflict('USERNAME_TAKEN', 'username', 'Este nome de usuário já está em uso.')
      }

      const salt = newSalt()
      const now = new Date().toISOString()
      const user: UserRecord = {
        id: `usr_${String(db.nextId('user')).padStart(4, '0')}`,
        email,
        username: input.username,
        displayName: input.username,
        avatarUrl: null,
        ensName: input.username.replace(/_/g, '-'),
        ensSuffix: '.eth',
        walletNickname: 'Principal',
        passwordSalt: salt,
        passwordHash: await hashPassword(input.password, salt),
        createdAt: now,
        updatedAt: now,
        version: 1,
      }
      db.state.users[user.id] = user
      db.state.favorites[user.id] = []

      adoptGuestCart(request, user.id)
      return createSession(user)
    },
    { status: 201, auth: 'none' },
  ),

  /** Sign in. 401 INVALID_CREDENTIALS without revealing which field is wrong. */
  route(
    'POST',
    '/session',
    async ({ request, body }) => {
      const input = await body(loginRequestSchema)
      const user = findUserByEmail(input.email)
      if (!user || !(await verifyPassword(user, input.password))) throw invalidCredentials()

      adoptGuestCart(request, user.id)
      return createSession(user)
    },
    { status: 201, auth: 'none' },
  ),

  /** Current session. 401 when the token is missing, unknown or expired. */
  route(
    'GET',
    '/session',
    ({ auth }) => {
      if (!auth) throw new Error('unreachable: route requires auth')
      return {
        user: toUser(auth.user),
        token: auth.session.token,
        expiresAt: auth.session.expiresAt,
      }
    },
    { auth: 'required' },
  ),

  /** Sign out. Always 204: ending a session that is already gone is not an error. */
  route(
    'DELETE',
    '/session',
    ({ request }) => {
      const token = bearerToken(request)
      if (token) endSession(token)
      return noContent()
    },
    { auth: 'none' },
  ),
]
