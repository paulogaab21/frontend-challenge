import {
  expect,
  test as base,
  type Page,
  type PageAssertionsToHaveScreenshotOptions,
} from '@playwright/test'

import type { Cart, EditionId, LoginRequest, Session } from '@/contracts'
import type { StoredSession } from '@/lib/session-store'
import type { MockControl } from '@/mocks/control'

import { FIXED_NOW } from './data'

export { expect } from '@playwright/test'

export type MockProxy = {
  [Method in keyof MockControl]: (
    ...args: Parameters<MockControl[Method]>
  ) => Promise<Awaited<ReturnType<MockControl[Method]>>>
}

export interface ApiResponse<T = unknown> {
  status: number
  headers: Record<string, string>
  body: T
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface ApiHelpers {
  request: <T = unknown>(
    method: Method,
    path: string,
    body?: unknown,
    headers?: Record<string, string>,
  ) => Promise<ApiResponse<T>>
  get: <T = unknown>(path: string) => Promise<ApiResponse<T>>
  login: (user: LoginRequest) => Promise<Session>
  addToCart: (nftId: string, editionId: EditionId, quantity?: number) => Promise<Cart>
}

interface GotoOptions {
  scenario?: string
  /** false opts out on the first navigation; a date chooses a different ticking epoch. */
  clock?: boolean | string | Date
}

interface AppHelpers {
  goto: (path?: string, options?: GotoOptions) => Promise<void>
  ready: () => Promise<void>
}

interface Fixtures {
  isolatedContext: void
  app: AppHelpers
  mocks: MockProxy
  api: ApiHelpers
}

function mockProxy(page: Page): MockProxy {
  return new Proxy({} as MockProxy, {
    get(_target, key) {
      if (typeof key !== 'string' || key === 'then') return undefined
      return (...args: unknown[]) =>
        page.evaluate(
          ({ method, parameters }) => {
            const control = window.__kurioMocks
            if (!control)
              throw new Error('Mock backend is not ready; use app.goto()/app.ready() first.')
            const operation = control[method] as (...values: unknown[]) => unknown
            return operation.apply(control, parameters)
          },
          { method: key as keyof MockControl, parameters: args },
        )
    },
  })
}

export const test = base.extend<Fixtures>({
  isolatedContext: [
    async ({ context }, provide) => {
      // Playwright provides a new context per test; fail loudly if storageState/reuse changes that contract.
      expect(
        context.serviceWorkers(),
        'a fresh test must have no registered service worker',
      ).toHaveLength(0)
      const state = await context.storageState()
      expect(state.cookies, 'a fresh test must have no cookies').toEqual([])
      expect(state.origins, 'a fresh test must have no localStorage from an earlier test').toEqual(
        [],
      )
      await provide()
    },
    { auto: true },
  ],

  app: async ({ page, baseURL }, provide) => {
    let clockInstalled = false
    let navigated = false
    const ready = async () => {
      await page.waitForFunction(
        () => Boolean(window.__kurioMocks && navigator.serviceWorker.controller),
        undefined,
        { timeout: 30_000 },
      )
      // Let initial page queries finish before a test applies a one-shot scenario.
      // WebSockets do not count as in-flight HTTP requests for this load state.
      await page.waitForLoadState('networkidle')
    }
    await provide({
      ready,
      async goto(route = '/', options = {}) {
        if (!baseURL) throw new Error('Playwright baseURL is required')
        if (!navigated && options.clock !== false) {
          const time =
            typeof options.clock === 'string' || options.clock instanceof Date
              ? options.clock
              : FIXED_NOW
          await page.clock.install({ time: new Date(time) })
          clockInstalled = true
        } else if (options.clock === false && clockInstalled) {
          throw new Error(
            'Choose clock: false on the first app.goto(); the installed clock persists across navigation.',
          )
        } else if (typeof options.clock === 'string' || options.clock instanceof Date) {
          if (!clockInstalled) throw new Error('Choose a clock before the first navigation.')
          await page.clock.setSystemTime(new Date(options.clock))
        }
        navigated = true
        const url = new URL(route, baseURL)
        if (options.scenario) url.searchParams.set('scenario', options.scenario)
        await page.goto(url.href)
        await ready()
      },
    })
  },

  mocks: async ({ page }, provide) => {
    await provide(mockProxy(page))
  },

  api: async ({ page, app }, provide) => {
    const request: ApiHelpers['request'] = async <T>(
      method: Method,
      pathname: string,
      body?: unknown,
      extraHeaders?: Record<string, string>,
    ) => {
      const response = await page.evaluate(
        async ({ method, pathname, body, extraHeaders }) => {
          if (!pathname.startsWith('/') || pathname.startsWith('//'))
            throw new Error('API helpers expect a relative path such as /nfts.')
          const stored = localStorage.getItem('kurio.session')
          const session = stored ? (JSON.parse(stored) as StoredSession) : null
          let cartToken = JSON.parse(localStorage.getItem('kurio.cart-token') ?? 'null') as
            string | null
          if (!session && !cartToken) {
            cartToken = crypto.randomUUID()
            localStorage.setItem('kurio.cart-token', JSON.stringify(cartToken))
          }
          const headers: Record<string, string> = { Accept: 'application/json' }
          if (body !== undefined) headers['Content-Type'] = 'application/json'
          if (session) headers.Authorization = `Bearer ${session.token}`
          if (cartToken) headers['X-Cart-Token'] = cartToken
          const response = await fetch(`/api${pathname}`, {
            method,
            headers: { ...headers, ...extraHeaders },
            body: body === undefined ? undefined : JSON.stringify(body),
          })
          const responseHeaders: Record<string, string> = {}
          response.headers.forEach((value, key) => {
            responseHeaders[key] = value
          })
          const text = await response.text()
          return {
            status: response.status,
            headers: responseHeaders,
            body: text ? (JSON.parse(text) as unknown) : null,
          }
        },
        { method, pathname, body, extraHeaders },
      )
      return response as ApiResponse<T>
    }
    await provide({
      request,
      get: (pathname) => request('GET', pathname),
      async login(user) {
        const response = await request<Session>('POST', '/session', {
          email: user.email,
          password: user.password,
        })
        expect(response.status, `login arrangement: ${JSON.stringify(response.body)}`).toBe(201)
        await page.evaluate((session) => {
          localStorage.setItem(
            'kurio.session',
            JSON.stringify({
              token: session.token,
              userId: session.user.id,
              expiresAt: session.expiresAt,
            } satisfies StoredSession),
          )
          localStorage.removeItem('kurio.cart-token')
        }, response.body)
        await page.reload()
        await app.ready()
        return response.body
      },
      async addToCart(nftId, editionId, quantity = 1) {
        const response = await request<Cart>('POST', '/cart/items', { nftId, editionId, quantity })
        expect(response.status, `cart arrangement: ${JSON.stringify(response.body)}`).toBe(201)
        return response.body
      },
    })
  },
})

/** Call inside a test to opt out of one configured project. */
export function skipProject(project: 'desktop' | 'mobile', reason: string): void {
  test.skip(test.info().project.name === project, reason)
}

export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const dimensions = await page.evaluate(() => ({
    viewport: innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }))
  expect(dimensions.document, 'document must fit the viewport').toBeLessThanOrEqual(
    dimensions.viewport,
  )
  expect(dimensions.body, 'body must fit the viewport').toBeLessThanOrEqual(dimensions.viewport)
}

type ScreenshotOptions = PageAssertionsToHaveScreenshotOptions

export async function expectScreenshot(
  page: Page,
  name: string,
  options: ScreenshotOptions = {},
): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready
    const visibleImages = Array.from(document.images).filter((image) => {
      const rect = image.getBoundingClientRect()
      return rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth
    })
    await Promise.all(visibleImages.map((image) => image.decode()))
  })
  const hidden = await page.addStyleTag({
    content: '[data-mock-devtools] { visibility: hidden !important; }',
  })
  try {
    await expect(page).toHaveScreenshot(name, options)
  } finally {
    await hidden.evaluate((element) => element.parentNode?.removeChild(element))
  }
}
