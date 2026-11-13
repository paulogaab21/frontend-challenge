import type { ApiErrorBody, ApiErrorCode } from '@/contracts'

/**
 * Every failure of the HTTP layer is normalized into one of these three classes, so
 * features never inspect Axios internals.
 */

/** The API answered with a non-2xx status and the standard error envelope. */
export class ApiError extends Error {
  override readonly name = 'ApiError'
  readonly status: number
  readonly code: ApiErrorCode
  readonly fieldErrors: Record<string, string[]>
  readonly details: unknown
  readonly requestId: string | undefined

  constructor(status: number, body: ApiErrorBody) {
    super(body.message)
    this.status = status
    this.code = body.code
    this.fieldErrors = body.fieldErrors ?? {}
    this.details = body.details
    this.requestId = body.requestId
  }
}

/** No response reached the client: offline, DNS, connection reset, CORS. */
export class NetworkError extends Error {
  override readonly name = 'NetworkError'
  constructor(message = 'Não foi possível conectar ao servidor. Verifique sua conexão.') {
    super(message)
  }
}

/** The request was sent but no answer arrived within the allowed time. */
export class TimeoutError extends Error {
  override readonly name = 'TimeoutError'
  constructor(message = 'O servidor demorou para responder. Tente novamente.') {
    super(message)
  }
}

export type HttpError = ApiError | NetworkError | TimeoutError

export function isApiError(
  error: unknown,
  code?: ApiErrorCode | ApiErrorCode[],
): error is ApiError {
  if (!(error instanceof ApiError)) return false
  if (code === undefined) return true
  return Array.isArray(code) ? code.includes(error.code) : error.code === code
}

/**
 * Failures worth retrying without user intervention: the request may succeed if
 * simply sent again (no connection, timeout, 5xx).
 */
export function isTransientError(error: unknown): boolean {
  if (error instanceof NetworkError || error instanceof TimeoutError) return true
  return error instanceof ApiError && error.status >= 500
}

export function isUnauthenticatedError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401
}

/** Message safe to show to the collector for any thrown value. */
export function errorMessage(
  error: unknown,
  fallback = 'Algo deu errado. Tente novamente.',
): string {
  if (error instanceof ApiError || error instanceof NetworkError || error instanceof TimeoutError) {
    return error.message
  }
  return fallback
}
