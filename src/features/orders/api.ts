import {
  IDEMPOTENCY_HEADER,
  IDEMPOTENT_REPLAY_HEADER,
  type CreateOrderInput,
  type Order,
  type OrderListResponse,
  type OrderStatus,
  type SimulatedTransaction,
} from '@/contracts'
import { http, request } from '@/lib/http'

export interface CreateOrderResult {
  order: Order
  /** True when the API answered with the order a previous request already created. */
  replayed: boolean
}

/**
 * Places the order. `idempotencyKey` identifies the purchase attempt: sending the
 * same key with the same body again returns the same order instead of a new one.
 */
export async function createOrder(
  input: CreateOrderInput,
  idempotencyKey: string,
): Promise<CreateOrderResult> {
  const response = await http.post<Order>('/orders', input, {
    headers: { [IDEMPOTENCY_HEADER]: idempotencyKey },
  })
  return {
    order: response.data,
    replayed: response.headers[IDEMPOTENT_REPLAY_HEADER.toLowerCase()] === 'true',
  }
}

export function fetchOrder(orderId: string, signal?: AbortSignal): Promise<Order> {
  return request<Order>({ url: `/orders/${encodeURIComponent(orderId)}`, method: 'GET', signal })
}

export function fetchOrders(
  params: { status?: OrderStatus },
  signal?: AbortSignal,
): Promise<OrderListResponse> {
  return request<OrderListResponse>({ url: '/orders', method: 'GET', params, signal })
}

export function fetchTransaction(
  hash: string,
  signal?: AbortSignal,
): Promise<SimulatedTransaction> {
  return request<SimulatedTransaction>({
    url: `/transactions/${encodeURIComponent(hash)}`,
    method: 'GET',
    signal,
  })
}
