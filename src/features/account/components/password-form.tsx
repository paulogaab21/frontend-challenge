import { deferBlurForSubmit } from '@/features/auth/components/defer-blur-for-submit'
import { useEffect, useRef } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { changePasswordFormSchema, type ChangePasswordFormValues } from '@/contracts'
import { Button } from '@/components/ui/button'
import { PasswordInput } from '@/components/ui/password-input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { FormServerFeedback } from '@/features/auth/components/form-server-feedback'
import { useServerErrors } from '@/features/auth/components/use-server-errors'
export interface PasswordFormProps {
  onSubmit: (values: ChangePasswordFormValues) => Promise<void> | void
  pending?: boolean
  formError?: string
  fieldErrors?: Record<string, string>
  defaultValues?: Partial<ChangePasswordFormValues>
  successMessage?: string
}
const fields = ['currentPassword', 'newPassword', 'confirmPassword'] as const
export function PasswordForm({
  onSubmit,
  pending,
  formError,
  fieldErrors,
  defaultValues,
  successMessage,
}: PasswordFormProps) {
  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordFormSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '', ...defaultValues },
    mode: 'onBlur',
    shouldFocusError: true,
  })
  useServerErrors({ form, fieldErrors, fieldNames: fields, formError })
  const { reset } = form
  const previous = useRef(successMessage)
  useEffect(() => {
    if (successMessage && successMessage !== previous.current)
      reset({ currentPassword: '', newPassword: '', confirmPassword: '' })
    previous.current = successMessage
  }, [successMessage, reset])
  const busy = pending || form.formState.isSubmitting
  return (
    <Form {...form}>
      <form
        noValidate
        aria-label="Alterar senha"
        onSubmit={form.handleSubmit(async (values) => {
          try {
            await onSubmit(values)
          } catch {
            /* Parent owns transport feedback. */
          }
        })}
      >
        <h2 className="text-base font-medium">Alterar senha</h2>
        <div className="mt-4">
          <FormServerFeedback error={formError} successMessage={successMessage} />
        </div>
        <fieldset disabled={pending} className="mt-5 max-w-[417px] space-y-6">
          <FormField
            control={form.control}
            name="currentPassword"
            render={({ field }) => (
              <FormItem className="gap-2">
                <FormLabel>Senha atual</FormLabel>
                <FormControl>
                  <PasswordInput
                    {...field}
                    onBlur={deferBlurForSubmit(field.onBlur)}
                    required
                    autoComplete="current-password"
                    className="rounded-[3px] text-sm"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem className="gap-2">
                <FormLabel>Nova senha</FormLabel>
                <FormControl>
                  <PasswordInput
                    {...field}
                    onBlur={deferBlurForSubmit(field.onBlur)}
                    required
                    autoComplete="new-password"
                    className="rounded-[3px] text-sm"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem className="gap-2">
                <FormLabel>Confirmar nova senha</FormLabel>
                <FormControl>
                  <PasswordInput
                    {...field}
                    onBlur={deferBlurForSubmit(field.onBlur)}
                    required
                    autoComplete="new-password"
                    className="rounded-[3px] text-sm"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </fieldset>
        <Button type="submit" className="mt-8 w-[131px] rounded-[3px] text-sm" loading={busy}>
          Salvar
        </Button>
      </form>
    </Form>
  )
}
