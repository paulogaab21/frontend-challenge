import type { FocusEvent } from 'react'
/** Submit validates the whole form. Avoid moving the submit button between
 * pointerdown and click by rendering an onBlur error just before that click. */
export function deferBlurForSubmit(onBlur: () => void) {
  return (event: FocusEvent<HTMLElement>) => {
    const next = event.relatedTarget
    if (
      next instanceof HTMLButtonElement &&
      next.type === 'submit' &&
      next.form === event.currentTarget.closest('form')
    )
      return
    onBlur()
  }
}
