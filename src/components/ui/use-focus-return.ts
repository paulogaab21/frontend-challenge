import { useRef } from 'react'

type AutoFocusHandler = (event: Event) => void

/** Controlled overlays can be opened without a Radix Trigger; retain their opener. */
export function useFocusReturn(onOpen?: AutoFocusHandler, onClose?: AutoFocusHandler) {
  const opener = useRef<HTMLElement | null>(null)
  return {
    onOpenAutoFocus(event: Event) {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      onOpen?.(event)
    },
    onCloseAutoFocus(event: Event) {
      onClose?.(event)
      const target = opener.current
      if (!event.defaultPrevented && target?.isConnected && target !== document.body) {
        event.preventDefault()
        target.focus({ preventScroll: true })
      }
    },
  }
}
