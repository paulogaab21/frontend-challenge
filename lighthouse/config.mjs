import { defaultSettings } from 'lighthouse/core/config/constants.js'
import desktopConfig from 'lighthouse/core/config/desktop-config.js'

// Editable data. Slugs also determine stable report directories.
export const pages = [
  { slug: 'home', title: 'Início', path: '/' },
  { slug: 'nft-detail', title: 'Detalhe do NFT', path: '/nft/emerald-ape-042' },
]

// Scores use the familiar 0–100 scale; do not round before asserting.
export const thresholds = {
  performance: 90,
  accessibility: 95,
  'best-practices': 95,
  seo: 90,
}

export const profiles = {
  mobile: {
    formFactor: defaultSettings.formFactor,
    screenEmulation: { ...defaultSettings.screenEmulation },
    throttling: { ...defaultSettings.throttling },
    emulatedUserAgent: defaultSettings.emulatedUserAgent,
    throttlingMethod: 'simulate',
  },
  desktop: { ...desktopConfig.settings, throttlingMethod: 'simulate' },
}

export function lighthouseConfig(profile) {
  return {
    extends: 'lighthouse:default',
    settings: {
      ...profiles[profile],
      onlyCategories: Object.keys(thresholds),
      // Preserve the MSW worker installed during this fresh profile's warm-up.
      // The runner clears the HTTP cache separately before every measurement.
      disableStorageReset: true,
    },
  }
}
