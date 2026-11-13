import { useCallback, useSyncExternalStore } from 'react'

/** Subscribes to a CSS media query. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const media = window.matchMedia(query)
      media.addEventListener('change', onChange)
      return () => media.removeEventListener('change', onChange)
    },
    [query],
  )
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches)
}

/** The desktop shell starts at Tailwind's `md` breakpoint (768px). */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 768px)')
}
