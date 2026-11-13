import { delay, http, HttpResponse, type HttpHandler, type PathParams } from 'msw'
import type { z } from 'zod'

import { env } from '@/lib/env'

import { mockConfig, type FailureRule, type HttpMethod } from '../config'
import { db } from '../db'
import { authenticate, requireAuth, type AuthContext } from '../domain/auth'
import { HttpProblem, problems } from '../domain/problem'
import { createRandom, hash32 } from '../lib/random'

/**
 * Wrapper every REST handler goes through. It is the single place where the
 * scenario shapes the network (latency, injected failures) and where domain errors
 * become the standard error envelope — handlers only describe the happy path and
 * throw `HttpProblem` for everything else.
 */

export const CART_TOKEN_HEADER = 'X-Cart-Token'

export interface RouteContext<Params extends PathParams = PathParams> {
  request: Request
  params: Params
  url: URL
  /** Session of the request; null for visitors. */
  auth: AuthContext | null
  /** Parses and validates the JSON body, answering 422 with field errors. */
  body: <Schema extends z.ZodType>(schema: Schema) => Promise<z.output<Schema>>
  /** `user:<id>` for sessions, `guest:<token>` for visitors. */
  cartKey: () => string
}

type Resolver<Params extends PathParams> = (
  context: RouteContext<Params>,
) => Promise<Response | object> | Response | object

interface RouteOptions {
  /**
   * - `optional` (default): resolves the session when a token is sent; a token that
   *   is no longer valid answers 401 SESSION_EXPIRED.
   * - `required`: additionally answers 401 UNAUTHENTICATED without a token.
   * - `none`: ignores the Authorization header (sign in, sign up, sign out).
   */
  auth?: 'optional' | 'required' | 'none'
  /** Status of a successful JSON answer. */
  status?: number
}

function apiPath(path: string): string {
  return `${env.apiUrl.replace(/\/$/, '')}${path}`
}

function latencyFor(sequence: number): number {
  const { mode, minMs, maxMs } = mockConfig.get().latency
  if (mode === 'fixed') return minMs
  if (mode === 'variable') {
    const random = createRandom(hash32('kurio-latency') + sequence)
    return Math.round(minMs + random() * (maxMs - minMs))
  }
  // descending: 1st request = maxMs, each next one faster, never below minMs.
  const step = (maxMs - minMs) / 4
  return Math.max(minMs, Math.round(maxMs - (sequence - 1) * step))
}

function matches(rule: FailureRule, method: string, path: string): boolean {
  if (rule.method && rule.method !== method) return false
  return rule.path === '*' || path === rule.path || path.startsWith(`${rule.path}/`)
}

function errorResponse(problem: HttpProblem, requestId: string): Response {
  return HttpResponse.json(
    { ...problem.body, requestId },
    { status: problem.status, headers: { 'X-Request-Id': requestId } },
  )
}

export function fieldErrorsOf(error: z.ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_'
    ;(fieldErrors[key] ??= []).push(issue.message)
  }
  return fieldErrors
}

export function route<Params extends PathParams = PathParams>(
  method: HttpMethod,
  path: string,
  resolver: Resolver<Params>,
  options: RouteOptions = {},
): HttpHandler {
  const register = {
    GET: http.get,
    POST: http.post,
    PUT: http.put,
    PATCH: http.patch,
    DELETE: http.delete,
  }[method]

  return register(apiPath(path), async ({ request, params }) => {
    const sequence = mockConfig.nextSequence()
    const requestId = `req_${String(sequence).padStart(5, '0')}`
    const url = new URL(request.url)
    const relativePath = url.pathname.slice(new URL(apiPath(''), url.origin).pathname.length) || '/'

    await delay(latencyFor(sequence))

    for (const rule of mockConfig.get().failures) {
      if (!matches(rule, method, relativePath) || !mockConfig.shouldFail(rule)) continue
      if (rule.kind === 'network') return HttpResponse.error()
      if (rule.kind === 'timeout') {
        await delay('infinite')
        return HttpResponse.error()
      }
      const status = rule.status ?? 500
      return errorResponse(
        new HttpProblem(
          status,
          rule.code ?? (status >= 500 ? 'INTERNAL_ERROR' : 'VALIDATION_ERROR'),
          rule.message ??
            (status >= 500
              ? 'O serviço está indisponível no momento. Tente novamente em instantes.'
              : 'Não foi possível concluir a solicitação.'),
        ),
        requestId,
      )
    }

    try {
      const auth =
        options.auth === 'none'
          ? null
          : options.auth === 'required'
            ? requireAuth(request)
            : authenticate(request)
      const context: RouteContext<Params> = {
        request,
        params: params as Params,
        url,
        auth,
        body: async (schema) => {
          let raw: unknown
          try {
            raw = await request.json()
          } catch {
            throw problems.validation({}, 'O corpo da requisição não é um JSON válido.')
          }
          const parsed = schema.safeParse(raw)
          if (!parsed.success) throw problems.validation(fieldErrorsOf(parsed.error))
          return parsed.data
        },
        cartKey: () => {
          if (auth) return `user:${auth.user.id}`
          const token = request.headers.get(CART_TOKEN_HEADER)
          if (!token) {
            throw problems.validation(
              {},
              `Visitantes precisam enviar o cabeçalho ${CART_TOKEN_HEADER}.`,
            )
          }
          return `guest:${token}`
        },
      }

      const result = await resolver(context)
      if (method !== 'GET') db.save()
      if (result instanceof Response) return result
      return HttpResponse.json(result, {
        status: options.status ?? 200,
        headers: { 'X-Request-Id': requestId },
      })
    } catch (error) {
      // Sessions removed while resolving (expiry) must not be resurrected by a save.
      db.save()
      if (error instanceof HttpProblem) return errorResponse(error, requestId)
      console.error('[mocks] Unhandled error in', method, path, error)
      return errorResponse(
        new HttpProblem(500, 'INTERNAL_ERROR', 'Erro inesperado no servidor simulado.'),
        requestId,
      )
    }
  })
}

/** Answers anything under the API base that no handler claimed. */
export const notFoundHandler: HttpHandler = http.all(apiPath('/*'), () =>
  errorResponse(problems.notFound('Rota não encontrada.'), 'req_unknown'),
)

export function noContent(): Response {
  return new HttpResponse(null, { status: 204 })
}
