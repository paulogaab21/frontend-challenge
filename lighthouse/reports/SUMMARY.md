# Kurio Lighthouse audit

Date (UTC): 2026-11-14T02:48:49.645Z. Source commit: `06d2cee9f83e05fc391f93608fd1fe087e803fc0` (frontend-challenge-solution; dirty: false).

Command: `npm run lighthouse -- --build`

Base URL: http://127.0.0.1:4173. Runs per page/profile: 3. Overall: **PASS**.

Scores are on a 0–100 scale; assertions use unrounded medians. LCP/TBT are milliseconds; CLS is unitless.

| Profile | Page | Performance ≥90 | Accessibility ≥95 | Best Practices ≥95 | SEO ≥90 | LCP ms | CLS | TBT ms | Result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| mobile | Início | 98 PASS | 100 PASS | 100 PASS | 100 PASS | 1876.2 | 0.0006 | 128 | PASS |
| mobile | Detalhe do NFT | 98 PASS | 100 PASS | 100 PASS | 100 PASS | 1715.2 | 0 | 139.2 | PASS |
| desktop | Início | 100 PASS | 100 PASS | 100 PASS | 100 PASS | 538 | 0.0017 | 0 | PASS |
| desktop | Detalhe do NFT | 100 PASS | 100 PASS | 100 PASS | 100 PASS | 538.5 | 0.0001 | 0 | PASS |

## Per-run values

| Profile / page | Run | Performance | Accessibility | Best Practices | SEO | LCP ms | CLS | TBT ms | MSW controls warm-up |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| mobile / home | [1](./mobile/home/run-1.report.html) | 98 | 100 | 100 | 100 | 1886.9 | 0.0006 | 128 | true |
| mobile / home | [2](./mobile/home/run-2.report.html) | 98 | 100 | 100 | 100 | 1876.1 | 0.0006 | 127 | true |
| mobile / home | [3](./mobile/home/run-3.report.html) | 98 | 100 | 100 | 100 | 1876.2 | 0.0006 | 129 | true |
| mobile / nft-detail | [1](./mobile/nft-detail/run-1.report.html) | 99 | 100 | 100 | 100 | 1719.3 | 0 | 134 | true |
| mobile / nft-detail | [2](./mobile/nft-detail/run-2.report.html) | 98 | 100 | 100 | 100 | 1715.2 | 0 | 139.2 | true |
| mobile / nft-detail | [3](./mobile/nft-detail/run-3.report.html) | 98 | 100 | 100 | 100 | 1712 | 0 | 142.9 | true |
| desktop / home | [1](./desktop/home/run-1.report.html) | 100 | 100 | 100 | 100 | 545.1 | 0.0017 | 0 | true |
| desktop / home | [2](./desktop/home/run-2.report.html) | 100 | 100 | 100 | 100 | 538 | 0.0017 | 0 | true |
| desktop / home | [3](./desktop/home/run-3.report.html) | 100 | 100 | 100 | 100 | 535.3 | 0.0017 | 0 | true |
| desktop / nft-detail | [1](./desktop/nft-detail/run-1.report.html) | 100 | 100 | 100 | 100 | 538.5 | 0.0001 | 0 | true |
| desktop / nft-detail | [2](./desktop/nft-detail/run-2.report.html) | 100 | 100 | 100 | 100 | 532.6 | 0.0001 | 0 | true |
| desktop / nft-detail | [3](./desktop/nft-detail/run-3.report.html) | 100 | 100 | 100 | 100 | 547.5 | 0.0001 | 0 | true |

## Environment and conditions

```json
{
  "versions": {
    "lighthouse": "13.6.0",
    "chromeLauncher": "1.2.3",
    "playwright": "1.65.0",
    "vite": "8.3.8",
    "node": "v24.19.0",
    "chrome": [
      "Chrome/157.0.8103.52"
    ]
  },
  "environment": {
    "os": "Windows_NT 10.0.19044 x64",
    "platform": "win32",
    "cpu": "AMD Ryzen 7 5700X3D 8-Core Processor           ",
    "logicalCores": 16,
    "totalMemoryBytes": 34278809600
  },
  "conditions": {
    "buildRequested": true,
    "server": "local Vite preview; dist must be a production demo build",
    "scenario": "default",
    "freshChromeProfilePerRun": true,
    "warmUp": "One home navigation per fresh profile; wait for registered service worker control, then clear HTTP cache",
    "storageReset": "disabled to retain MSW registration; no profile reused across runs",
    "profiles": {
      "mobile": {
        "formFactor": "mobile",
        "screenEmulation": {
          "mobile": true,
          "width": 412,
          "height": 823,
          "deviceScaleFactor": 1.75,
          "disabled": false
        },
        "throttling": {
          "rttMs": 150,
          "throughputKbps": 1638.4,
          "requestLatencyMs": 562.5,
          "downloadThroughputKbps": 1474.5600000000002,
          "uploadThroughputKbps": 675,
          "cpuSlowdownMultiplier": 4
        },
        "emulatedUserAgent": "Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Mobile Safari/537.36",
        "throttlingMethod": "simulate",
        "onlyCategories": [
          "performance",
          "accessibility",
          "best-practices",
          "seo"
        ],
        "disableStorageReset": true
      },
      "desktop": {
        "formFactor": "desktop",
        "throttling": {
          "rttMs": 40,
          "throughputKbps": 10240,
          "cpuSlowdownMultiplier": 1,
          "requestLatencyMs": 0,
          "downloadThroughputKbps": 0,
          "uploadThroughputKbps": 0
        },
        "screenEmulation": {
          "mobile": false,
          "width": 1350,
          "height": 940,
          "deviceScaleFactor": 1,
          "disabled": false
        },
        "emulatedUserAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
        "throttlingMethod": "simulate",
        "onlyCategories": [
          "performance",
          "accessibility",
          "best-practices",
          "seo"
        ],
        "disableStorageReset": true
      }
    },
    "thresholds": {
      "performance": 90,
      "accessibility": 95,
      "best-practices": 95,
      "seo": 90
    },
    "assertionsEnabled": true
  }
}
```

## Warnings / errors

None.
