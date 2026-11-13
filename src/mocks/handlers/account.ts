import {
  AVATAR_FIELD,
  AVATAR_MAX_BYTES,
  AVATAR_MIME_TYPES,
  changePasswordRequestSchema,
  connectWalletRequestSchema,
  createWalletRequestSchema,
  updateProfileRequestSchema,
  updateWalletRequestSchema,
  type ActiveConnectionResponse,
  type Profile,
  type WalletsResponse,
} from '@/contracts'

import type { UserRecord } from '../db'
import {
  findUserByEmail,
  findUserByUsername,
  hashPassword,
  newSalt,
  verifyPassword,
} from '../domain/auth'
import { HttpProblem, problems } from '../domain/problem'
import {
  activeConnection,
  connectWallet,
  createWallet,
  dropConnection,
  findWallet,
  listWallets,
  toConnection,
  toWallet,
  updateWallet,
} from '../domain/wallets'
import { db } from '../db'
import { noContent, route } from './route'

function toProfile(user: UserRecord): Profile {
  return {
    id: user.id,
    displayName: user.displayName,
    username: user.username,
    email: user.email,
    ensName: user.ensName,
    ensSuffix: user.ensSuffix,
    walletNickname: user.walletNickname,
    avatarUrl: user.avatarUrl,
    updatedAt: user.updatedAt,
    version: user.version,
  }
}

function touch(user: UserRecord): void {
  user.updatedAt = new Date().toISOString()
  user.version += 1
}

function fieldProblem(
  status: number,
  code: ConstructorParameters<typeof HttpProblem>[1],
  field: string,
  message: string,
): HttpProblem {
  return new HttpProblem(status, code, message, { fieldErrors: { [field]: [message] } })
}

async function toDataUrl(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  let binary = ''
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000))
  }
  return `data:${file.type};base64,${btoa(binary)}`
}

export const accountHandlers = [
  route(
    'GET',
    '/profile',
    ({ auth }) => {
      if (!auth) throw problems.unauthenticated()
      return toProfile(auth.user)
    },
    { auth: 'required' },
  ),

  /** 409 EMAIL_TAKEN / USERNAME_TAKEN when another account owns the value. */
  route(
    'PUT',
    '/profile',
    async ({ auth, body }) => {
      if (!auth) throw problems.unauthenticated()
      const input = await body(updateProfileRequestSchema)
      const user = auth.user

      const emailOwner = findUserByEmail(input.email)
      if (emailOwner && emailOwner.id !== user.id) {
        throw fieldProblem(409, 'EMAIL_TAKEN', 'email', 'Já existe uma conta com este e-mail.')
      }
      const usernameOwner = findUserByUsername(input.username)
      if (usernameOwner && usernameOwner.id !== user.id) {
        throw fieldProblem(
          409,
          'USERNAME_TAKEN',
          'username',
          'Este nome de usuário já está em uso.',
        )
      }

      Object.assign(user, { ...input, email: input.email.toLowerCase() })
      touch(user)
      return toProfile(user)
    },
    { auth: 'required' },
  ),

  /** multipart/form-data with one `file` part (PNG, JPEG or WebP, up to 2 MB). */
  route(
    'PUT',
    '/profile/avatar',
    async ({ auth, request }) => {
      if (!auth) throw problems.unauthenticated()
      let file: FormDataEntryValue | null = null
      try {
        file = (await request.formData()).get(AVATAR_FIELD)
      } catch {
        file = null
      }
      if (!(file instanceof File)) {
        throw fieldProblem(422, 'VALIDATION_ERROR', AVATAR_FIELD, 'Envie um arquivo de imagem.')
      }
      if (!(AVATAR_MIME_TYPES as readonly string[]).includes(file.type)) {
        throw fieldProblem(
          422,
          'VALIDATION_ERROR',
          AVATAR_FIELD,
          'Use uma imagem PNG, JPEG ou WebP.',
        )
      }
      if (file.size > AVATAR_MAX_BYTES) {
        throw fieldProblem(
          422,
          'VALIDATION_ERROR',
          AVATAR_FIELD,
          'A imagem deve ter no máximo 2 MB.',
        )
      }
      auth.user.avatarUrl = await toDataUrl(file)
      touch(auth.user)
      return toProfile(auth.user)
    },
    { auth: 'required' },
  ),

  route(
    'DELETE',
    '/profile/avatar',
    ({ auth }) => {
      if (!auth) throw problems.unauthenticated()
      if (auth.user.avatarUrl !== null) {
        auth.user.avatarUrl = null
        touch(auth.user)
      }
      return toProfile(auth.user)
    },
    { auth: 'required' },
  ),

  /** 422 WRONG_PASSWORD when the current password does not match. */
  route(
    'PUT',
    '/profile/password',
    async ({ auth, body }) => {
      if (!auth) throw problems.unauthenticated()
      const input = await body(changePasswordRequestSchema)
      if (!(await verifyPassword(auth.user, input.currentPassword))) {
        throw fieldProblem(
          422,
          'WRONG_PASSWORD',
          'currentPassword',
          'A senha atual está incorreta.',
        )
      }
      if (input.newPassword === input.currentPassword) {
        throw fieldProblem(
          422,
          'VALIDATION_ERROR',
          'newPassword',
          'A nova senha deve ser diferente da atual.',
        )
      }
      auth.user.passwordSalt = newSalt()
      auth.user.passwordHash = await hashPassword(input.newPassword, auth.user.passwordSalt)
      touch(auth.user)
      // Other sessions of the account are signed out; the current one stays.
      for (const session of Object.values(db.state.sessions)) {
        if (session.userId === auth.user.id && session.token !== auth.session.token) {
          delete db.state.sessions[session.token]
        }
      }
      return noContent()
    },
    { auth: 'required' },
  ),

  route(
    'GET',
    '/wallets',
    ({ auth }): WalletsResponse => {
      if (!auth) throw problems.unauthenticated()
      return { items: listWallets(auth.user.id).map(toWallet) }
    },
    { auth: 'required' },
  ),

  /** 409 WALLET_ROLE_TAKEN / WALLET_ADDRESS_TAKEN on conflict. */
  route(
    'POST',
    '/wallets',
    async ({ auth, body }) => {
      if (!auth) throw problems.unauthenticated()
      const { role, sameAsPrimary, ...fields } = await body(createWalletRequestSchema)
      return toWallet(createWallet(auth.user.id, role, fields, sameAsPrimary))
    },
    { auth: 'required', status: 201 },
  ),

  route<{ walletId: string }>(
    'PUT',
    '/wallets/:walletId',
    async ({ auth, params, body }) => {
      if (!auth) throw problems.unauthenticated()
      const { sameAsPrimary, ...fields } = await body(updateWalletRequestSchema)
      return toWallet(updateWallet(auth.user.id, params.walletId, fields, sameAsPrimary))
    },
    { auth: 'required' },
  ),

  route(
    'GET',
    '/wallet-connections/current',
    ({ auth }): ActiveConnectionResponse => {
      if (!auth) throw problems.unauthenticated()
      const connection = activeConnection(auth.user.id)
      return { connection: connection ? toConnection(connection) : null }
    },
    { auth: 'required' },
  ),

  /** Simulated wallet prompt. 403 WALLET_CONNECTION_REJECTED when refused. */
  route(
    'POST',
    '/wallet-connections',
    async ({ auth, body }) => {
      if (!auth) throw problems.unauthenticated()
      const input = await body(connectWalletRequestSchema)
      if (input.walletId) findWallet(auth.user.id, input.walletId)
      return toConnection(
        connectWallet(auth.user.id, input.walletId, input.address, input.provider, input.network),
      )
    },
    { auth: 'required', status: 201 },
  ),

  route<{ connectionId: string }>(
    'DELETE',
    '/wallet-connections/:connectionId',
    ({ auth, params }) => {
      if (!auth) throw problems.unauthenticated()
      const connection = db.state.connections[params.connectionId]
      if (connection && connection.userId !== auth.user.id) throw problems.forbidden()
      if (connection) dropConnection(connection.id)
      return noContent()
    },
    { auth: 'required' },
  ),
]
