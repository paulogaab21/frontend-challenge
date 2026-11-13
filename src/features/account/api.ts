import {
  AVATAR_FIELD,
  type ActiveConnectionResponse,
  type ChangePasswordRequest,
  type ConnectWalletRequest,
  type CreateWalletRequest,
  type Profile,
  type UpdateProfileRequest,
  type UpdateWalletRequest,
  type Wallet,
  type WalletConnection,
  type WalletsResponse,
} from '@/contracts'
import { request } from '@/lib/http'

/* ---- profile ---- */

export function fetchProfile(signal?: AbortSignal): Promise<Profile> {
  return request<Profile>({ url: '/profile', method: 'GET', signal })
}

export function updateProfile(input: UpdateProfileRequest): Promise<Profile> {
  return request<Profile>({ url: '/profile', method: 'PUT', data: input })
}

export function uploadAvatar(file: File): Promise<Profile> {
  const form = new FormData()
  form.append(AVATAR_FIELD, file)
  // Axios sets the multipart boundary itself when given a FormData body.
  return request<Profile>({ url: '/profile/avatar', method: 'PUT', data: form })
}

export function removeAvatar(): Promise<Profile> {
  return request<Profile>({ url: '/profile/avatar', method: 'DELETE' })
}

export function changePassword(input: ChangePasswordRequest): Promise<void> {
  return request<void>({ url: '/profile/password', method: 'PUT', data: input })
}

/* ---- wallets ---- */

export function fetchWallets(signal?: AbortSignal): Promise<WalletsResponse> {
  return request<WalletsResponse>({ url: '/wallets', method: 'GET', signal })
}

export function createWallet(input: CreateWalletRequest): Promise<Wallet> {
  return request<Wallet>({ url: '/wallets', method: 'POST', data: input })
}

export function updateWallet(walletId: string, input: UpdateWalletRequest): Promise<Wallet> {
  return request<Wallet>({
    url: `/wallets/${encodeURIComponent(walletId)}`,
    method: 'PUT',
    data: input,
  })
}

/* ---- wallet connection (simulated) ---- */

export function fetchActiveConnection(signal?: AbortSignal): Promise<ActiveConnectionResponse> {
  return request<ActiveConnectionResponse>({
    url: '/wallet-connections/current',
    method: 'GET',
    signal,
  })
}

export function connectWallet(input: ConnectWalletRequest): Promise<WalletConnection> {
  return request<WalletConnection>({ url: '/wallet-connections', method: 'POST', data: input })
}

export function disconnectWallet(connectionId: string): Promise<void> {
  return request<void>({
    url: `/wallet-connections/${encodeURIComponent(connectionId)}`,
    method: 'DELETE',
  })
}
