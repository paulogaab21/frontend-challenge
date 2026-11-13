import { useEffect, useRef } from 'react'
import type { FieldPath, FieldValues, UseFormReturn } from 'react-hook-form'
export interface ServerErrorsOptions<T extends FieldValues> {
  form: UseFormReturn<T>
  fieldErrors?: Record<string, string>
  fieldNames: readonly FieldPath<T>[]
  formError?: string
}
export function useServerErrors<T extends FieldValues>({
  form,
  fieldErrors,
  fieldNames,
  formError,
}: ServerErrorsOptions<T>) {
  const previous = useRef<FieldPath<T>[]>([])
  const { setError, clearErrors, getFieldState } = form
  useEffect(() => {
    for (const name of previous.current) {
      if (!fieldErrors?.[name] && getFieldState(name).error?.type === 'server') clearErrors(name)
    }
    const fields = fieldNames.filter((name) => Boolean(fieldErrors?.[name]))
    fields.forEach((name, index) =>
      setError(
        name,
        { type: 'server', message: fieldErrors?.[name] },
        { shouldFocus: index === 0 && !formError },
      ),
    )
    previous.current = fields
  }, [fieldErrors, fieldNames, formError, setError, clearErrors, getFieldState])
}
