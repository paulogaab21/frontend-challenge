import { toast } from 'sonner'

/**
 * Transient feedback for mutations and real-time changes.
 *
 * Messages are rendered by the app's single <Toaster>, which is an ARIA live
 * region: sighted users get a toast, screen-reader users get the announcement.
 * Passing an `id` replaces a previous message about the same subject instead of
 * stacking a new one (e.g. several price changes of the same NFT).
 */

interface NotifyOptions {
  id?: string
  description?: string
  /** Keeps the message on screen until dismissed. */
  persistent?: boolean
}

function options({ id, description, persistent }: NotifyOptions = {}) {
  return { id, description, duration: persistent ? Infinity : 6_000 }
}

export const notify = {
  success: (message: string, opts?: NotifyOptions) => toast.success(message, options(opts)),
  error: (message: string, opts?: NotifyOptions) => toast.error(message, options(opts)),
  info: (message: string, opts?: NotifyOptions) => toast.info(message, options(opts)),
  warning: (message: string, opts?: NotifyOptions) => toast.warning(message, options(opts)),
  dismiss: (id?: string) => toast.dismiss(id),
}
