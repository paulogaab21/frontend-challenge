import { useEffect, useRef } from 'react'
import { AlertIcon, CheckIcon } from '@/components/icons'
import { Alert, AlertDescription } from '@/components/ui/alert'
export interface FormServerFeedbackProps {
  error?: string
  successMessage?: string
}
export function FormServerFeedback({ error, successMessage }: FormServerFeedbackProps) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (error) ref.current?.focus()
  }, [error])
  return (
    <>
      {error && (
        <Alert ref={ref} tabIndex={-1} variant="destructive">
          <AlertIcon />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {successMessage && !error && (
        <p role="status" className="flex items-center gap-2 text-sm text-sand">
          <CheckIcon className="text-copper" />
          {successMessage}
        </p>
      )}
    </>
  )
}
