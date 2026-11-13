import { type ApiErrorBody, type ApiErrorCode } from '@/contracts'

/**
 * Thrown by the domain functions to answer a request with the standard error
 * envelope. The route wrapper converts it into the HTTP response.
 */
export class HttpProblem extends Error {
  readonly status: number
  readonly body: ApiErrorBody

  constructor(
    status: number,
    code: ApiErrorCode,
    message: string,
    extra: { fieldErrors?: Record<string, string[]>; details?: unknown } = {},
  ) {
    super(message)
    this.status = status
    this.body = { code, message, ...extra }
  }
}

export const problems = {
  validation: (fieldErrors: Record<string, string[]>, message = 'Revise os campos destacados.') =>
    new HttpProblem(422, 'VALIDATION_ERROR', message, { fieldErrors }),
  unauthenticated: () =>
    new HttpProblem(401, 'UNAUTHENTICATED', 'Entre na sua conta para continuar.'),
  sessionExpired: () =>
    new HttpProblem(401, 'SESSION_EXPIRED', 'Sua sessão expirou. Entre novamente para continuar.'),
  forbidden: (message = 'Você não tem permissão para acessar este recurso.') =>
    new HttpProblem(403, 'FORBIDDEN', message),
  notFound: (message = 'Recurso não encontrado.') => new HttpProblem(404, 'NOT_FOUND', message),
  conflict: (code: ApiErrorCode, message: string, details?: unknown) =>
    new HttpProblem(409, code, message, details === undefined ? {} : { details }),
}
