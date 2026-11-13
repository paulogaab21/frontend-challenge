import type { AddCartItemRequest, Cart, CreateQuoteRequest, Quote } from '@/contracts'
import { request } from '@/lib/http'

export function fetchCart(signal?: AbortSignal): Promise<Cart> {
  return request<Cart>({ url: '/cart', method: 'GET', signal })
}

export function addCartItem(input: AddCartItemRequest): Promise<Cart> {
  return request<Cart>({ url: '/cart/items', method: 'POST', data: input })
}

export function updateCartItem(itemId: string, quantity: number): Promise<Cart> {
  return request<Cart>({
    url: `/cart/items/${encodeURIComponent(itemId)}`,
    method: 'PATCH',
    data: { quantity },
  })
}

export function removeCartItem(itemId: string): Promise<Cart> {
  return request<Cart>({ url: `/cart/items/${encodeURIComponent(itemId)}`, method: 'DELETE' })
}

export function applyCoupon(code: string): Promise<Cart> {
  return request<Cart>({ url: '/cart/coupon', method: 'PUT', data: { code } })
}

export function removeCoupon(): Promise<Cart> {
  return request<Cart>({ url: '/cart/coupon', method: 'DELETE' })
}

/** Prices the current cart. A POST by contract, a read by nature (no side effects). */
export function createQuote(input: CreateQuoteRequest, signal?: AbortSignal): Promise<Quote> {
  return request<Quote>({ url: '/quotes', method: 'POST', data: input, signal })
}
