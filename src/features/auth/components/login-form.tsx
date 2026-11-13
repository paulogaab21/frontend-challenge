import { deferBlurForSubmit } from '@/features/auth/components/defer-blur-for-submit'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { loginRequestSchema, type LoginRequest } from '@/contracts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { FormServerFeedback } from './form-server-feedback'
import { useServerErrors } from './use-server-errors'
export interface LoginFormProps {
  onSubmit: (values: LoginRequest) => Promise<void> | void
  pending?: boolean
  formError?: string
  fieldErrors?: Record<string, string>
  defaultValues?: Partial<LoginRequest>
  onForgotPassword?: () => void
}
const fields = ['email', 'password'] as const
export function LoginForm({
  onSubmit,
  pending = false,
  formError,
  fieldErrors,
  defaultValues,
  onForgotPassword,
}: LoginFormProps) {
  const form = useForm<LoginRequest>({
    resolver: zodResolver(loginRequestSchema),
    defaultValues: { email: '', password: '', ...defaultValues },
    mode: 'onBlur',
    shouldFocusError: true,
  })
  useServerErrors({ form, fieldErrors, fieldNames: fields, formError })
  const busy = pending || form.formState.isSubmitting
  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(async (values) => {
          try {
            await onSubmit(values)
          } catch {
            /* The parent exposes transport errors through formError/fieldErrors. */
          }
        })}
        aria-label="Entrar"
        className="space-y-0"
      >
        <FormServerFeedback error={formError} />
        <fieldset disabled={pending} className="space-y-3">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="gap-0">
                <FormLabel className="sr-only">E-mail</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    onBlur={deferBlurForSubmit(field.onBlur)}
                    type="email"
                    autoComplete="email"
                    placeholder="contato@email.com"
                    required
                    sizeVariant="responsive"
                  />
                </FormControl>
                <FormMessage className="mt-1" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem className="gap-0">
                <FormLabel className="sr-only">Senha</FormLabel>
                <FormControl>
                  <PasswordInput
                    {...field}
                    onBlur={deferBlurForSubmit(field.onBlur)}
                    autoComplete="current-password"
                    placeholder="Senha"
                    required
                    sizeVariant="responsive"
                  />
                </FormControl>
                <FormMessage className="mt-1" />
              </FormItem>
            )}
          />
          <div className="pt-0 text-right">
            <Button
              variant="link"
              className="text-sm"
              onClick={onForgotPassword}
              disabled={!onForgotPassword || busy}
            >
              Esqueceu a senha?
            </Button>
          </div>
        </fieldset>
        <Button
          type="submit"
          loading={busy}
          className="mt-8 h-[60px] w-full rounded-xl md:mt-4 md:h-[45px] md:rounded-[5px]"
        >
          Entrar
        </Button>
      </form>
    </Form>
  )
}
