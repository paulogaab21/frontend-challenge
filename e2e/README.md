# Browser tests and mock controls

Use Node 22.19+ and the dependencies from the committed lockfile. The tests target the optimized demo build, with MSW enabled and the default scenario. API arrangements run **inside the page**, so they go through the real service worker. Playwright's Node `request` fixture and `page.route()` bypass that backend and should not be used to arrange mock data.

## Run

```powershell
npm install
npx playwright install chromium
npm run e2e
npm run e2e -- --project=desktop
npm run e2e -- --project=mobile
npm run e2e -- mock-layer.spec.ts --grep "stale checkout"
npm run e2e:ui
# Equivalent:
npm run e2e -- --ui
npm run e2e:report
```

The config starts `npm run build && npm run preview -- --port 4173 --strictPort` and waits up to three minutes. The build uses `VITE_ENABLE_MOCKS=true` and `VITE_MOCK_SCENARIO=default`. Port 4173 is reserved for the preview. Locally it can reuse an existing server; make sure that server is an optimized demo build with mocks, rather than an old build or Vite development server. CI always starts its own server. The base URL is `http://localhost:4173`.

To use an already running optimized demo, opt out of the managed server:

```powershell
$env:PLAYWRIGHT_BASE_URL = 'http://localhost:4173'
npm run e2e
Remove-Item Env:PLAYWRIGHT_BASE_URL
```

That target must enable MSW and expose `window.__kurioMocks`; these infrastructure specs cannot run against a real backend. No deployment or publishing is performed by this configuration.

Chromium is the only browser: `desktop` is 1440×900; `mobile` is 390×844, touch enabled, with DPR 1. Both use `pt-BR`, `America/Sao_Paulo`, and service workers. Specs run fully in parallel, with four local workers and two in CI; CI retries once. Use `skipProject('mobile', 'reason')` inside a test to opt out of a project, or Playwright's native `test.skip`/tags and CLI `--grep`.

## Fixtures

Always import `test` and `expect` from `./support/fixtures`, not directly from `@playwright/test`. The automatic fixture asserts that every test starts in a fresh browser context with no cookies, persisted localStorage origins, or registered service worker. It does not clear state between steps within a test: persistence and reload behavior remain testable.

```ts
import { NFT_IDS, users } from './support/data'
import { expect, test } from './support/fixtures'

test('example arrangement', async ({ app, api, mocks }) => {
  await app.goto('/', { scenario: 'payment-pending' })
  await api.login(users.ana)
  await api.addToCart(NFT_IDS.emeraldApe, 'fifty', 2)
  await mocks.setPrice(NFT_IDS.emeraldApe, '1.29', 'fifty')
  const response = await api.get('/cart')
  expect(response.status).toBe(200)
  // Exercise the behavior being tested through the UI from here.
})
```

`app.goto(path = '/', { scenario?, clock? })` installs Playwright's **ticking** clock before the first navigation. Its default starting instant is `FIXED_NOW = 2026-07-29T15:00:00.000Z`, three hours after the catalog fixture epoch. It waits for both `window.__kurioMocks` and a controlling service worker before returning. `app.ready()` repeats that readiness check after a manual `page.reload()`.

`clock` can be a Date/ISO string to choose another ticking start, or `false` on the first navigation to use real time. The chosen clock persists through reloads; subsequent `goto()` calls do not rewind it. Explicit Date/string values on later navigations update the system time. To simulate elapsed time, use `page.clock.fastForward(ms)` (skip ahead, invoke due intervals once) or `page.clock.runFor(ms)` (run every due callback). A clock that keeps ticking allows MSW/network latency, Socket.IO heartbeats and timers to run normally.

Scenario URL switches are removed by the mock boot code after they are applied. The fixture does not add `?reset`: the fresh context already starts from the seed, and later navigations must preserve state unless reset was explicitly requested. `mocks.setScenario(id)` replaces the configuration and restarts failure counters without discarding data; `mocks.setScenario(id, { reset: true })` restores seed data too. `mocks.reset()` restores data and the default scenario. Call a scenario switch immediately before exercising one-shot failures; future product UI may make catalog requests and consume them during startup.

Coupons with relative expiry, including `RELAMPAGO`, are timed from **database seeding**, not from the catalog epoch. It is valid for two hours after the test's first boot/reset; advance the ticking clock to test expiry.

`mocks` is a typed asynchronous proxy derived from `MockControl`. It preserves arguments/returns for every control, including `configure`, `failRequests`, `snapshot`, `events`, `redeliver`, `settleOrder`, `expireSessions` and socket outages. It calls `page.evaluate` and binds each method to the control, preserving methods such as `setScenario(..., { reset: true })` that use `this`. Examples:

```ts
await mocks.startSocketOutage(6000)
const [orderId] = await mocks.pendingOrders()
if (orderId) await mocks.settleOrder(orderId, 'confirmed')
const events = await mocks.events()
if (events[0]) await mocks.redeliver(events[0].id)
```

`api` arranges REST state; it never updates React caches or calls the domain modules directly:

- `api.login(users.ana | users.bruno)` posts to `/api/session` with the visitor cart token when present. It stores `{ token, userId, expiresAt }` under `kurio.session`, removes `kurio.cart-token`, reloads and waits for mock readiness. This also lets the server merge the guest cart as the real login does.
- `api.addToCart(nftId, editionId, quantity = 1)` posts a cart item and returns the cart, asserting the successful status.
- `api.get<T>(path)` returns `{ status, headers, body }`, including error envelopes. Paths are relative to `/api`, e.g. `/nfts`, `/orders/ord_1000`; headers use lowercase names.
- `api.request<T>(method, path, body?, headers?)` supports other arrangements, including coupons, favorites, wallets and idempotency keys. Network failures reject. Non-2xx HTTP responses are returned for assertions; parse `body` with the shared contract schema when verifying it.

The helpers read auth/cart credentials from localStorage on every call and create a visitor cart token only when needed. `login` deliberately reloads so module-level session stores see the new identity. If arranging visitor state after product code has already initialized an in-memory cart token, reload before exercising UI state. Use the real UI for flows under test, rather than replacing them with these arrangements.

`support/data.ts` imports fixture user/NFT IDs and reads coupon/wallet fixtures, so test data follows the shared mock definitions. The two passwords are fictitious public demo credentials.

## Screenshots

```ts
import { expectNoHorizontalOverflow, expectScreenshot, test } from './support/fixtures'

test('page layout', async ({ app, page }) => {
  await app.goto()
  await expectNoHorizontalOverflow(page)
  await expectScreenshot(page, 'home.png')
})
```

`expectScreenshot` waits for `document.fonts.ready` and decodes every image intersecting the viewport. Broken images fail that check. It temporarily hides `[data-mock-devtools]` with visibility CSS (including its expanded drawer), preserving layout, then restores it even on an assertion failure. It forwards optional Playwright screenshot settings. Wait for the page's actual ready state/skeletons to disappear before calling it.

Screenshot assertions disable animations and hide the caret; the maximum differing pixel ratio is 0.005. Baselines live at `e2e/__screenshots__/{projectName}/{testFilePath}/{arg}{ext}` without an OS suffix. **Generate baselines on Windows using the Chromium revision pinned by the Playwright version in `package-lock.json`**: currently Playwright 1.65.0 / Chromium 158.0.8127.18, revision 1254. Do not use a system Chrome channel for baselines. Other operating systems/font renderers can differ even with the same browser revision.

```powershell
npm run e2e:update
npm run e2e:update -- --project=mobile
```

Review changed images before committing them. This brief provides infrastructure and mock-server specs; product page screenshot baselines and UI purchase specs belong to the next brief.

## Results and troubleshooting

HTML output is in `playwright-report/index.html`; `npm run e2e:report` opens it. Failed tests keep traces, screenshots and videos under `test-results/`. Open a trace with `npx playwright show-trace <path-to-trace.zip>`; these generated artifacts are ignored by git. A fresh run removes old test results. The console uses the list reporter and records results separately by project.

If readiness times out, verify that the production build enables mocks, the origin supports service workers (`localhost`/HTTPS), and `/mockServiceWorker.js` is reachable. If assertions see real HTML instead of JSON, the request probably bypassed MSW or the target did not boot the worker. Use a page-side helper, not the Node request client. An occupied preview port or an incompatible existing build should be stopped/rebuilt before retrying.

## Mount the operator panel

The coordinator owns the application mount. Keep it lazy and render it only when mocks are enabled:

```tsx
const MockDevtools = lazy(() =>
  import('@/mocks/devtools').then((module) => ({ default: module.MockDevtools })),
)

// Inside the app, after mock bootstrap is ready:
{
  env.enableMocks && (
    <Suspense fallback={null}>
      <MockDevtools />
    </Suspense>
  )
}
```

The collapsed pill is fixed above the mobile tab bar and reserves no layout space. The expanded non-modal panel imports its own chunk only on first open, focuses its close button, closes on Esc, and returns focus to the pill. All reads and mutations use `MockControl`; snapshot/event polling runs once per second only while expanded. Native labeled controls and inline `role="status"` feedback keep it independent of app toasts and private feature code. Public test credentials live in a separate mock-only data module.

Changes affect the simulated server; the application learns them from REST and Socket.IO. Reset/scenario actions do not clear application credentials or mutate Query caches. Expiring a server session leaves client state to react to its next authenticated response, matching a server-side expiry. The panel is a developer tool marked “Ambiente simulado,” not a Figma product screen.
