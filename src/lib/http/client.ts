import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios'

import { apiErrorSchema } from '@/contracts'
import { env } from '@/lib/env'
import { cartTokenStore, sessionStore } from '@/lib/session-store'

import { ApiError, NetworkError, TimeoutError } from './errors'

export const CART_TOKEN_HEADER = 'X-Cart-Token'

/** Default time budget of a request. Individual calls can override `timeoutMs`. */
export const DEFAULT_TIMEOUT_MS = 15_000

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Time budget in milliseconds; 0 disables the timeout. */
    timeoutMs?: number
  }
  interface InternalAxiosRequestConfig {
    /** Token the request was sent with — lets late 401s be matched to a session. */
    sentWithToken?: string | null
    /** Releases the timeout timer and abort listener of the request. */
    releaseTimeout?: () => void
  }
}

const TIMEOUT_REASON = Symbol('kurio.http.timeout')

/**
 * The single Axios instance of the app. All REST traffic goes through it:
 * - authenticates with the bearer token of the current session;
 * - identifies the visitor cart with `X-Cart-Token`;
 * - enforces a time budget per request;
 * - converts every failure into ApiError | NetworkError | TimeoutError;
 * - ends the local session when the API reports it as expired.
 */
export const http = axios.create({
  baseURL: env.apiUrl,
  headers: { Accept: 'application/json' },
  // Arrays are sent as repeated keys: ?category=a&category=b
  paramsSerializer: { indexes: null },
  // The time budget is enforced below with an AbortController.
  timeout: 0,
})

/**
 * Requests wait for this promise before leaving the app. The bootstrap swaps it for
 * the transport start-up (service worker registration in the demo build) so the UI
 * can render immediately while the network layer comes up.
 */
let transportReady: Promise<unknown> = Promise.resolve()

export function setTransportReady(ready: Promise<unknown>): void {
  transportReady = ready
}

export function whenTransportReady(): Promise<unknown> {
  return transportReady
}

http.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  await transportReady

  const token = sessionStore.getToken()
  config.sentWithToken = token
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  const cartToken = cartTokenStore.get()
  if (cartToken) {
    config.headers.set(CART_TOKEN_HEADER, cartToken)
  }

  // Timeout built on a JS timer so it also covers time spent in interceptors and
  // surfaces as a typed TimeoutError. It chains to the caller's signal (query
  // cancellation) instead of replacing it.
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS
  if (timeoutMs > 0) {
    const controller = new AbortController()
    const callerSignal = config.signal as AbortSignal | undefined
    const forwardAbort = () => controller.abort(callerSignal?.reason)
    if (callerSignal?.aborted) forwardAbort()
    callerSignal?.addEventListener?.('abort', forwardAbort, { once: true })
    const timer = setTimeout(() => controller.abort(TIMEOUT_REASON), timeoutMs)
    config.signal = controller.signal
    config.releaseTimeout = () => {
      clearTimeout(timer)
      callerSignal?.removeEventListener?.('abort', forwardAbort)
    }
  }

  return config
})

http.interceptors.response.use(
  (response) => {
    response.config.releaseTimeout?.()
    return response
  },
  (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error)
    error.config?.releaseTimeout?.()
    return Promise.reject(normalizeError(error))
  },
)

function normalizeError(error: AxiosError): unknown {
  const signal = error.config?.signal as AbortSignal | undefined

  if (axios.isCancel(error) || error.code === AxiosError.ERR_CANCELED) {
    // Aborted by our timer → timeout. Aborted by the caller → keep the cancellation
    // as is, so TanStack Query can recognise and silently discard it.
    return signal?.reason === TIMEOUT_REASON ? new TimeoutError() : error
  }

  if (error.code === AxiosError.ECONNABORTED || error.code === AxiosError.ETIMEDOUT) {
    return new TimeoutError()
  }

  const response = error.response
  if (!response) return new NetworkError()

  const parsed = apiErrorSchema.safeParse(response.data)
  const apiError = parsed.success
    ? new ApiError(response.status, parsed.data)
    : new ApiError(response.status, {
        code: response.status >= 500 ? 'INTERNAL_ERROR' : 'VALIDATION_ERROR',
        message:
          response.status >= 500
            ? 'O serviço está indisponível no momento. Tente novamente em instantes.'
            : 'Não foi possível concluir a solicitação.',
      })

  // A 401 for a request that carried a token means that token is no longer valid.
  // `expire` ignores the signal when the session has already changed since then.
  if (response.status === 401 && apiError.code !== 'INVALID_CREDENTIALS') {
    sessionStore.expire(error.config?.sentWithToken ?? null)
  }

  return apiError
}

/** Shorthand used by the feature `api.ts` modules: returns the response body. */
export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await http.request<T>(config)
  return response.data
}
