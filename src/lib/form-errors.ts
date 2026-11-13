import { errorMessage, isApiError } from '@/lib/http'

/** How a failed submission is shown by a form: next to fields and/or above them. */
export interface FormFailure {
  formError?: string
  fieldErrors?: Record<string, string>
}

/**
 * Maps an error thrown by the HTTP layer onto a form.
 *
 * Errors the API ties to a field (`fieldErrors` of the error envelope: validation,
 * conflicts such as "e-mail already in use") go next to that field; anything else
 * becomes the form-level message. `prefix` strips the path of a nested request
 * body ("collector.email" → "email").
 */
export function toFormFailure(error: unknown, prefix = ''): FormFailure {
  if (isApiError(error)) {
    const fieldErrors: Record<string, string> = {}
    for (const [path, messages] of Object.entries(error.fieldErrors)) {
      const message = messages[0]
      if (!message || !path.startsWith(prefix)) continue
      fieldErrors[path.slice(prefix.length)] = message
    }
    if (Object.keys(fieldErrors).length > 0) return { fieldErrors }
  }
  return { formError: errorMessage(error) }
}
