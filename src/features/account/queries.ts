import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type {
  ActiveConnectionResponse,
  ChangePasswordRequest,
  ConnectWalletRequest,
  CreateWalletRequest,
  Profile,
  Session,
  UpdateProfileRequest,
  UpdateWalletRequest,
  Wallet,
  WalletsResponse,
} from '@/contracts'
import { isCurrentScope, useSession } from '@/features/auth/session'
import { queryKeys } from '@/lib/query-keys'
import { realtime } from '@/lib/realtime/client'

import * as api from './api'

/* -------------------------------------------------------------------------- */
/* Profile                                                                    */
/* -------------------------------------------------------------------------- */

export function profileQueryOptions(scope: string) {
  return queryOptions({
    queryKey: queryKeys.private.profile(scope),
    queryFn: ({ signal }) => api.fetchProfile(signal),
  })
}

export function useProfile() {
  const { isAuthenticated, scope } = useSession()
  return useQuery({ ...profileQueryOptions(scope), enabled: isAuthenticated })
}

/**
 * Profile mutations answer with the saved profile, which replaces the cache entry.
 * The header shows the same person, so the session's user object is patched too.
 */
function useProfileMutation<Input>(mutationFn: (input: Input) => Promise<Profile>) {
  const queryClient = useQueryClient()
  const { scope } = useSession()

  return useMutation({
    mutationFn,
    onSuccess: (profile) => {
      if (!isCurrentScope(scope)) return
      queryClient.setQueryData(queryKeys.private.profile(scope), profile)
      queryClient.setQueryData<Session>(queryKeys.private.session(scope), (session) =>
        session
          ? {
              ...session,
              user: {
                ...session.user,
                displayName: profile.displayName,
                username: profile.username,
                email: profile.email,
                avatarUrl: profile.avatarUrl,
              },
            }
          : session,
      )
    },
  })
}

export function useUpdateProfile() {
  return useProfileMutation((input: UpdateProfileRequest) => api.updateProfile(input))
}

export function useUploadAvatar() {
  return useProfileMutation((file: File) => api.uploadAvatar(file))
}

export function useRemoveAvatar() {
  return useProfileMutation((_input: void) => api.removeAvatar())
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: ChangePasswordRequest) => api.changePassword(input),
  })
}

/* -------------------------------------------------------------------------- */
/* Wallets                                                                    */
/* -------------------------------------------------------------------------- */

export function walletsQueryOptions(scope: string) {
  return queryOptions({
    queryKey: queryKeys.private.wallets(scope),
    queryFn: ({ signal }) => api.fetchWallets(signal),
  })
}

export function useWallets() {
  const { isAuthenticated, scope } = useSession()
  return useQuery({ ...walletsQueryOptions(scope), enabled: isAuthenticated })
}

function upsertWallet(current: WalletsResponse | undefined, wallet: Wallet): WalletsResponse {
  const others = (current?.items ?? []).filter((item) => item.id !== wallet.id)
  const items = [...others, wallet].sort((a, b) =>
    a.role === b.role ? 0 : a.role === 'primary' ? -1 : 1,
  )
  return { items }
}

function useWalletMutation<Input>(mutationFn: (input: Input) => Promise<Wallet>) {
  const queryClient = useQueryClient()
  const { scope } = useSession()
  const key = queryKeys.private.wallets(scope)

  return useMutation({
    mutationFn,
    onSuccess: (wallet) => {
      if (!isCurrentScope(scope)) return
      queryClient.setQueryData<WalletsResponse>(key, (current) => upsertWallet(current, wallet))
    },
    // Whatever happened, make sure the list matches the server.
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}

export function useCreateWallet() {
  return useWalletMutation((input: CreateWalletRequest) => api.createWallet(input))
}

export function useUpdateWallet() {
  return useWalletMutation(
    ({ walletId, input }: { walletId: string; input: UpdateWalletRequest }) =>
      api.updateWallet(walletId, input),
  )
}

/* -------------------------------------------------------------------------- */
/* Wallet connection (simulated)                                              */
/* -------------------------------------------------------------------------- */

export function connectionQueryOptions(scope: string) {
  return queryOptions({
    queryKey: queryKeys.private.connection(scope),
    queryFn: async ({ signal }) => {
      const response = await api.fetchActiveConnection(signal)
      if (response.connection) {
        realtime.observe('wallet-connection', response.connection.id, response.connection.version)
      }
      return response
    },
    staleTime: 0,
  })
}

export function useActiveConnection() {
  const { isAuthenticated, scope } = useSession()
  return useQuery({ ...connectionQueryOptions(scope), enabled: isAuthenticated })
}

export function useConnectWallet() {
  const queryClient = useQueryClient()
  const { scope } = useSession()
  return useMutation({
    mutationFn: (input: ConnectWalletRequest) => api.connectWallet(input),
    onSuccess: (connection) => {
      if (!isCurrentScope(scope)) return
      realtime.observe('wallet-connection', connection.id, connection.version)
      queryClient.setQueryData<ActiveConnectionResponse>(queryKeys.private.connection(scope), {
        connection,
      })
    },
  })
}

export function useDisconnectWallet() {
  const queryClient = useQueryClient()
  const { scope } = useSession()
  const key = queryKeys.private.connection(scope)
  return useMutation({
    mutationFn: (connectionId: string) => api.disconnectWallet(connectionId),
    onSuccess: () => {
      if (!isCurrentScope(scope)) return
      queryClient.setQueryData<ActiveConnectionResponse>(key, { connection: null })
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}
