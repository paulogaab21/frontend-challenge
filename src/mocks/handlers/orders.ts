import { delay, HttpResponse } from 'msw'

import {
  createOrderRequestSchema,
  IDEMPOTENCY_HEADER,
  IDEMPOTENT_REPLAY_HEADER,
  orderStatusSchema,
  type OrderListResponse,
} from '@/contracts'

import { mockConfig } from '../config'
import { db } from '../db'
import { endSession } from '../domain/auth'
import { createOrder, findOrder, findTransaction, listOrders, toOrder } from '../domain/orders'
import { problems } from '../domain/problem'
import { realtimeServer } from '../realtime/server'
import { route } from './route'

export const orderHandlers = [
  /**
   * Places the order for the quoted cart.
   *
   * 201 created · 200 replay of the same attempt (Idempotent-Replayed: true)
   * 409 QUOTE_STALE (details.quote = fresh quote) · 409 IDEMPOTENCY_KEY_REUSED
   * 409 CART_EMPTY · 409 WALLET_DISCONNECTED · 422 VALIDATION_ERROR · 401
   */
  route(
    'POST',
    '/orders',
    async ({ auth, request, body }) => {
      if (!auth) throw problems.unauthenticated()
      const config = mockConfig.get()

      // Scenario: the session dies at the exact moment the purchase is submitted.
      if (config.expireSessionOn === 'order' && mockConfig.once('expire-on-order')) {
        endSession(auth.session.token)
        throw problems.sessionExpired()
      }

      const idempotencyKey = request.headers.get(IDEMPOTENCY_HEADER)?.trim()
      if (!idempotencyKey) {
        throw problems.validation(
          { [IDEMPOTENCY_HEADER]: ['Cabeçalho obrigatório.'] },
          `O cabeçalho ${IDEMPOTENCY_HEADER} é obrigatório para criar pedidos.`,
        )
      }

      const input = await body(createOrderRequestSchema)
      const { order, replayed } = createOrder(auth, idempotencyKey, input)

      if (!replayed) {
        if (config.socketOutageOnOrderMs !== null) {
          realtimeServer.startOutage(config.socketOutageOnOrderMs)
        }
        // Scenario: the order exists, but the answer to the first request is lost.
        if (config.orderResponse === 'timeout-once' && mockConfig.once('order-timeout')) {
          db.save()
          await delay('infinite')
        }
      }

      return HttpResponse.json(toOrder(order), {
        status: replayed ? 200 : 201,
        headers: replayed ? { [IDEMPOTENT_REPLAY_HEADER]: 'true' } : {},
      })
    },
    { auth: 'required' },
  ),

  /** Orders of the session, newest first. Optional `status` filter. */
  route(
    'GET',
    '/orders',
    ({ auth, url }): OrderListResponse => {
      if (!auth) throw problems.unauthenticated()
      const status = orderStatusSchema.safeParse(url.searchParams.get('status') ?? undefined)
      const all = listOrders(auth.user.id).filter(
        (order) => !status.success || order.status === status.data,
      )
      const pageSize = 20
      return {
        items: all.slice(0, pageSize).map(toOrder),
        page: 1,
        pageSize,
        totalItems: all.length,
        totalPages: Math.ceil(all.length / pageSize),
      }
    },
    { auth: 'required' },
  ),

  /** State and receipt of one order. 403 for someone else's order, 404 if unknown. */
  route<{ orderId: string }>(
    'GET',
    '/orders/:orderId',
    ({ auth, params }) => {
      if (!auth) throw problems.unauthenticated()
      return toOrder(findOrder(auth.user.id, params.orderId))
    },
    { auth: 'required' },
  ),

  /** Simulated block explorer entry of a confirmed order. */
  route<{ hash: string }>(
    'GET',
    '/transactions/:hash',
    ({ auth, params }) => {
      if (!auth) throw problems.unauthenticated()
      return findTransaction(auth.user.id, params.hash)
    },
    { auth: 'required' },
  ),
]
