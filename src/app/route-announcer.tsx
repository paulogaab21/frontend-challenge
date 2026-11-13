import { useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

/**
 * Tells assistive technology that the page changed. A client-side navigation
 * loads no new document, so nothing is announced on its own: after each resolved
 * navigation to a different path, the new document title is spoken through a
 * polite live region.
 */
export function RouteAnnouncer() {
  const router = useRouter()
  const [message, setMessage] = useState('')

  useEffect(
    () =>
      router.subscribe('onResolved', ({ pathChanged }) => {
        if (!pathChanged) return
        // Pages set their title in an effect; read it once they have rendered.
        requestAnimationFrame(() => setMessage(document.title))
      }),
    [router],
  )

  return (
    <p aria-live="polite" aria-atomic="true" className="sr-only">
      {message}
    </p>
  )
}
