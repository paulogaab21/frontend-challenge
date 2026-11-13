import { type LoginRequest, type RegisterRequest, type Session } from '@/contracts'
import { request } from '@/lib/http'

export function fetchSession(signal?: AbortSignal): Promise<Session> {
  return request<Session>({ url: '/session', method: 'GET', signal })
}

export function login(input: LoginRequest): Promise<Session> {
  return request<Session>({ url: '/session', method: 'POST', data: input })
}

export function register(input: RegisterRequest): Promise<Session> {
  return request<Session>({ url: '/users', method: 'POST', data: input })
}

export function logout(): Promise<void> {
  return request<void>({ url: '/session', method: 'DELETE' })
}
