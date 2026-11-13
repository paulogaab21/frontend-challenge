import { useSyncExternalStore, type CSSProperties } from 'react'
import { CircleCheck, Info, LoaderCircle, OctagonX, TriangleAlert } from 'lucide-react'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

const mobileQuery = '(max-width: 767px)'
function subscribe(callback: () => void) {
  const media = window.matchMedia(mobileQuery)
  media.addEventListener('change', callback)
  return () => media.removeEventListener('change', callback)
}
export function Toaster({ toastOptions, ...props }: ToasterProps) {
  const mobile = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(mobileQuery).matches,
    () => false,
  )
  return (
    <Sonner
      theme="dark"
      position={mobile ? 'top-center' : 'bottom-right'}
      closeButton
      containerAriaLabel="Notificações"
      className="font-mono"
      icons={{
        success: <CircleCheck size={18} strokeWidth={1.5} className="text-success" />,
        error: <OctagonX size={18} strokeWidth={1.5} className="text-coral" />,
        info: <Info size={18} strokeWidth={1.5} className="text-amber" />,
        warning: <TriangleAlert size={18} strokeWidth={1.5} className="text-amber" />,
        loading: <LoaderCircle size={18} strokeWidth={1.5} className="motion-safe:animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'var(--card)',
          '--normal-text': 'var(--foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': '6px',
          '--font-family': 'var(--font-mono)',
        } as CSSProperties
      }
      toastOptions={{
        closeButtonAriaLabel: 'Fechar notificação',
        ...toastOptions,
        classNames: {
          toast: 'font-mono',
          description: '!text-sand',
          actionButton: '!bg-copper !text-ink',
          cancelButton: '!bg-band !text-cream',
          ...toastOptions?.classNames,
        },
      }}
      {...props}
    />
  )
}
