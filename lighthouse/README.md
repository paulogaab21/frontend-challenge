# Kurio artwork and Lighthouse tooling

Run from the repository root on Node 22.19+ (Lighthouse's minimum), with dependencies installed and Chrome available. `chrome-launcher` detects Chrome; set `CHROME_PATH` to select a particular installation. No additional dependency or global CLI is needed.

## Generate the artwork

```powershell
npm install
npm run assets:images
```

The four committed `scripts/artwork-sources/*.png` originals make generation independent of the local Figma export. `scripts/optimize-images.mjs` generates 96, 160, 256, 320, 480, 640, 900 and 1254 px square AVIF and WebP variants, one 640 px JPEG per original, and the typed `src/assets/artworks.ts` manifest. The console table reports every output's byte size. Stable source order and no timestamps keep output deterministic for the same Sharp/libvips version. Encoder versions can change bytes; use the lockfile.

Encoding: AVIF quality 60 / effort 6 / 4:4:4 chroma, WebP quality 85 / effort 6, JPEG quality 88 / MozJPEG / 4:4:4 chroma. Each manifest entry includes Sharp's dominant color and a blurred 20 px WebP data URI. These are tuned lossy encodings; compare detail against the originals before changing quality. The PNG sources are not copied to the public directory.

```tsx
import { Artwork, artworkSrcSet } from '@/components/artwork'

<Artwork
  id="emerald-ape"
  sizes="(min-width: 768px) 320px, calc(100vw - 48px)"
  className="w-full rounded-2xl"
  priority
/>

// Optional head preload: use the SAME sizes value as the rendered image.
<link
  rel="preload"
  as="image"
  type="image/avif"
  imageSrcSet={artworkSrcSet('emerald-ape', 'avif')}
  imageSizes="(min-width: 768px) 320px, calc(100vw - 48px)"
/>
```

`sizes` is required and must describe the rendered CSS width. The class applies to the square `<picture>` wrapper; its image fills that box with `object-fit: cover`. Intrinsic width/height and the square aspect ratio reserve layout space. The placeholder remains behind the opaque decoded image and requires no JavaScript load state. Default loading is lazy/async; set `priority` only for the LCP artwork. Alt text defaults to the Portuguese manifest description; `alt=""` marks a decorative image. `artworkSrcSet(id, 'avif' | 'webp')` returns a raw width-descriptor srcset.

## Audit the optimized demo

```powershell
# Recommended: build with default MSW scenario, then audit both pages/profiles, 3 times each.
npm run lighthouse -- --build

# Existing production build (never uses the Vite development server).
npm run build
npm run lighthouse

# Sample placeholder pages may miss targets; retain reports while suppressing score assertions.
npm run lighthouse -- --build --no-assert

# Narrow an investigation. Slugs are declared in config.mjs.
npm run lighthouse -- --only mobile --page home --runs 1 --no-assert

# An already running production demo; the caller controls its build and scenario.
npm run lighthouse -- --url http://127.0.0.1:4173 --runs 3
```

`--runs` is a positive integer (default 3), `--only` accepts `mobile` or `desktop`, and `--page` accepts a configured page slug. `--url` accepts an HTTP(S) base without credentials, query or fragment; a subdirectory base is supported. Without `--url`, the runner starts and stops Vite preview itself, preferring port 4173 and selecting a free port if it is occupied. `--build` invokes the existing `npm run build` with `VITE_ENABLE_MOCKS=true` and `VITE_MOCK_SCENARIO=default`. Use `--build` via `npm run lighthouse`, not a direct Node invocation. Existing builds and external URLs must already have default mocks enabled; the runner cannot infer their compile-time environment.

The page list, thresholds, and profile settings are versioned in `config.mjs`. Mobile inherits the installed Lighthouse default mobile emulation and simulated Slow 4G throttling. Desktop uses the installed Lighthouse desktop configuration and simulated Dense 4G. Resolved settings, including viewport, DPR, CPU slowdown, RTT and throughput, are saved with every run and in the summary.

## MSW warm-up and measurement conditions

Every measurement launches a **fresh temporary Chrome profile**. It navigates to the home page once, waits for React to mount and asynchronous initialization to settle, then waits for service-worker control if a worker is registered. It records registrations and whether the page is controlled. If startup has registered a worker but control never arrives, the run fails instead of measuring an uncontrolled app.

The HTTP cache is then explicitly cleared through CDP. The warm-up tab stays open until Chrome teardown because MSW unregisters itself when its last client closes. Lighthouse measures a separate tab with its storage reset disabled so it cannot unregister MSW before navigation. This is a repeat navigation with initialized mock storage and a cold HTTP cache, not a first visit including worker installation. Cache Storage and application storage created by the warm-up remain for that run; profiles are never shared between runs. Avoid adding an asset-caching worker without revisiting these conditions.

The initial scaffold does not boot MSW and its NFT detail route is a router fallback. An absent worker is reported as a warning so tooling can be exercised against that scaffold. Final challenge evidence must show a controlling worker and the actual NFT page. A successful audit of fallback content cannot establish that the detail page meets the challenge.

All runs execute sequentially. Chrome and the owned preview/build process trees are shut down on success, failure and Ctrl-C. The runner does not stop any independently running server or user browser.

## Output and assertions

Reports are versioned under stable names:

```text
lighthouse/reports/<mobile|desktop>/<home|nft-detail>/run-<n>.report.html
lighthouse/reports/<mobile|desktop>/<home|nft-detail>/run-<n>.report.json
lighthouse/reports/summary.json
lighthouse/reports/SUMMARY.md
```

`SUMMARY.md` contains category medians, PASS/FAIL per target, metric medians, individual run values, report links, versions (Lighthouse/Chrome/launcher/Playwright/Vite/Node), OS/CPU/memory, UTC date, source commit/dirty status, command and conditions. The JSON retains machine-readable values, warnings and resolved settings. LCP and TBT use milliseconds; CLS is unitless. HTML reports contain the individual audit opportunities and failures.

Each category and each metric is aggregated **independently**: sort finite numeric values and choose the middle value, or the arithmetic mean of the two middle values for an even run count. No individual report is chosen as "the median run." Assertions compare unrounded category medians against Performance ≥90, Accessibility ≥95, Best Practices ≥95 and SEO ≥90. Missing scores or incomplete runs fail; they are never treated as zero or a passing value. LCP/CLS/TBT are recorded without separate thresholds.

The exit code is 1 if any category median misses its target, a run is incomplete, or a build/browser/audit fails. `--no-assert` suppresses score failures only; operational failures still exit 1. Reports retain their FAIL status with that flag. Partial summaries are saved after every completed measurement. Ctrl-C exits 130 (SIGTERM 143), leaving already written evidence.

Only the selected page/profile directories are refreshed: surplus `run-*.report.html/json` files in those directories are removed. Other profiles' reports remain, while `summary.json` and `SUMMARY.md` always describe **only the latest invocation**. Re-run without filters for complete final evidence.

## Variance and final measurement

Close heavy background work, keep the machine plugged in and record any unusual conditions separately. Thermal state, CPU contention, power management, Chrome/Lighthouse upgrades, antivirus, network access to external assets, and the localhost server can change results. Simulated throttling makes comparisons more repeatable but does not eliminate variance. Keep the lockfile and Chrome version fixed when comparing changes. Three runs and medians reduce outlier influence.

The committed initial reports cover scaffold content, not completed marketplace performance. Rebuild and re-run both pages/profiles after the coordinator merges the UI, data and MSW boot code. Use the report's warning/error list and individual HTML audits to address score failures, and inspect actual page content before treating scores as final acceptance evidence.
