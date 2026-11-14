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

The config starts `npm run build && npm run preview -- --port 4173 --strictPort` and waits up to three minutes. The build uses `VITE_ENABLE_MOCKS=true` and `VITE_MOCK_SCENARIO=default`. Port 4173 is reserved for the preview. Each run owns its server locally and in CI: implicit reuse could select an old build or a previous run's preview that is about to shut down. The base URL is `http://localhost:4173`.

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

`app.goto(path = '/', { scenario?, clock? })` installs Playwright's **ticking** clock before the first navigation. Its default starting instant is `FIXED_NOW = 2026-07-29T15:00:00.000Z`, three hours after the catalog fixture epoch. It waits for both `window.__kurioMocks` and a controlling service worker, then for initial HTTP queries to settle. `app.ready()` repeats that readiness check after a manual `page.reload()`. This prevents startup queries from consuming a one-shot failure scenario meant for the next action.

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

`expectScreenshot` waits for `document.fonts.ready` and decodes every painted image intersecting the viewport. With `{ fullPage: true }`, it scrolls through the document to trigger native lazy loading, decodes the images at each position and restores the original scroll position. Images in closed accordions are excluded with `checkVisibility`, since their deferred loading must not block the screenshot. Broken visible images fail that check. It temporarily hides `[data-mock-devtools]` with visibility CSS (including its expanded drawer), preserving layout, then restores it even on an assertion failure. It forwards optional Playwright screenshot settings. Wait for the page's actual ready state/skeletons to disappear before calling it.

`expectElementScreenshot(page, locator, name)` applies the same preparation to a section baseline. `prepareScreenshot(page, fullPage?)` exposes the font/image preparation for report attachments without a committed baseline.

Screenshot assertions disable animations and hide the caret; the maximum differing pixel ratio is 0.005. Baselines live at `e2e/__screenshots__/{projectName}/{testFilePath}/{arg}{ext}` without an OS suffix. **Generate baselines on Windows using the Chromium revision pinned by the Playwright version in `package-lock.json`**: currently Playwright 1.65.0 / Chromium 158.0.8127.18, revision 1254. Do not use a system Chrome channel for baselines. Other operating systems/font renderers can differ even with the same browser revision.

```powershell
npm run e2e:update
npm run e2e:update -- --project=mobile
# Use an explicit mode when selecting a file (otherwise the optional mode consumes its name):
npm run e2e -- e2e/visual.spec.ts --update-snapshots=all
npm run e2e -- e2e/visual.spec.ts
```

Review changed images before committing them. `visual.spec.ts` pins full pages for home, NFT detail, a populated cart and payment, plus the catalog section alone, on both projects (ten PNGs). It uses the default seed/scenario and fixed clock; the home hero is explicitly set to its first slide (autoplay is off in the app). A desktop-context smoke check also captures the four pages at 768px as report attachments and checks horizontal overflow. The payment baseline uses Ana's registered primary wallet; the mobile collector and summary accordions retain their initial collapsed state.

## Purchase and realtime coverage

All five feature specs import the same isolated fixtures and run on both projects:

- `cart.spec.ts`: detail edition/quantity, badge count, accumulated and separate lines, stock limits, totals, removal/empty state, coupon errors/discount/removal, reload and UI login adoption.
- `purchase.spec.ts`: visitor catalog-to-receipt purchase through UI login, exact API receipt/stock/cart checks, immutable receipt/explorer and manual pending settlement with later-added items retained.
- `payment-failures.spec.ts`: decline/retry, triple click and Enter-plus-click, timeout recovery with replay header and reload, wallet refusal/disconnection, session expiry with draft restoration, accessible field validation without an order request.
- `realtime.spec.ts`: live cart/review prices, quote acknowledgment, stock, duplicate/stale frames, foreign-account events, outage/reconnection, pending reload/terminal settlement and sign-out cleanup. Socket cases first require one connected mock client so a missing transport cannot make negative assertions pass vacuously. Separate active cases verify 409 responses, corrected quotes, page notices and no created order.
- `visual.spec.ts`: the stable baselines and tablet captures described above.

`support/purchase-page.ts` contains responsive cart-line locators, payment/review helpers, real UI login, REST contract parsers and receipt/quote assertions. `gotoPage` waits for the service worker and initial queries after full navigation.

## Coverage of the challenge statement (section 9)

| #   | Required scenario                                                     | Specs (both projects unless noted)                                                                                                                                                                                 |
| --- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Search, combined filters, sorting, pagination and history restoration | `catalog.spec.ts` (search + filters + sorting vs REST, pagination resets on filter change, back/forward/reload/deep links, out-of-order responses, invalid URL params); `mock-layer.spec.ts` (REST filters/facets) |
| 2   | Direct access to the detail and unknown resource                      | `nft-detail.spec.ts` (cold load/reload, unknown NFT, unknown edition, quantity limit, gallery)                                                                                                                     |
| 3   | Sign-up, sign-in, session expiry, sign-out and user switch            | `auth.spec.ts`                                                                                                                                                                                                     |
| 4   | Favorites, including mutation failure and recovery                    | `favorites.spec.ts` (optimistic add/remove rollback, retry, per-user isolation)                                                                                                                                    |
| 5   | Cart, quantities, removal, coupon, persistence after refresh/login    | `cart.spec.ts`                                                                                                                                                                                                     |
| 6   | Complete purchase, from catalog to confirmed receipt                  | `purchase.spec.ts`                                                                                                                                                                                                 |
| 7   | Payment failure, repeated click and timeout recovering the same order | `payment-failures.spec.ts`; `mock-layer.spec.ts` (idempotency replay / key reuse)                                                                                                                                  |
| 8   | Profile, avatar, password and wallets, with validation errors         | `account.spec.ts`                                                                                                                                                                                                  |
| 9   | Price/availability change via Socket.IO during checkout               | `realtime.spec.ts` (live change inside review, `price-change-at-checkout`, `sold-out-at-checkout`, availability events)                                                                                            |
| 10  | Duplicate/stale events, disconnection and pending-order resumption    | `realtime.spec.ts` (duplicate/stale frames, foreign-account broadcast, socket outage, pending reload, terminal orders, sign-out cleanup)                                                                           |
| 11  | Keyboard navigation, dialog focus and form validation                 | `a11y.spec.ts` (keyboard flows, focus traps/return, axe WCAG 2.1 A/AA scans, reflow at 390/768/1440/720 px, reduced motion); validation also in `account`, `auth`, `payment-failures`                              |
| 12  | Skeletons under slow loading, failure feedback and retry              | `resilience.spec.ts` (layout-shift checks, 500/503/offline/timeout, inline recovery)                                                                                                                               |
| —   | Visual regression of home, detail, cart and payment                   | `visual.spec.ts` (versioned baselines under `__screenshots__/{desktop,mobile}`)                                                                                                                                    |

Realtime assertions always go through the application's `socket.io-client` (the mock server only emits frames) and REST through the MSW handlers; no test writes to application state or caches. Time-sensitive cases install the Playwright clock and trigger events explicitly through `window.__kurioMocks`.

## Results and troubleshooting

HTML output is in `playwright-report/index.html`; `npm run e2e:report` opens it. Failed tests keep traces, screenshots and videos under `test-results/`. Open a trace with `npx playwright show-trace <path-to-trace.zip>`; these generated artifacts are ignored by git. A fresh run removes old test results. The console uses the list reporter and records results separately by project.

If readiness times out, verify that the production build enables mocks, the origin supports service workers (`localhost`/HTTPS), and `/mockServiceWorker.js` is reachable. If assertions see real HTML instead of JSON, the request probably bypassed MSW or the target did not boot the worker. Use a page-side helper, not the Node request client. An occupied preview port or an incompatible existing build should be stopped/rebuilt before retrying.
