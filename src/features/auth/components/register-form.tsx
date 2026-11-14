import { deferBlurForSubmit } from '@/features/auth/components/defer-blur-for-submit'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { registerFormSchema, type RegisterFormValues } from '@/contracts'
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
export interface RegisterFormProps {
  onSubmit: (values: RegisterFormValues) => Promise<void> | void
  pending?: boolean
  formError?: string
  fieldErrors?: Record<string, string>
  defaultValues?: Partial<RegisterFormValues>
}
const fields = ['username', 'email', 'password', 'confirmPassword'] as const
export function RegisterForm({
  onSubmit,
  pending = false,
  formError,
  fieldErrors,
  defaultValues,
}: RegisterFormProps) {
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { username: '', email: '', password: '', confirmPassword: '', ...defaultValues },
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
        aria-label="Criar perfil de colecionador"
      >
        <FormServerFeedback error={formError} />
        <fieldset disabled={pending} className="space-y-3">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem className="gap-0">
                <FormLabel className="sr-only">Nome de usuário</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    onBlur={deferBlurForSubmit(field.onBlur)}
                    autoComplete="username"
                    placeholder="Nome de usuário"
                    required
                    sizeVariant="responsive"
                    className="placeholder:text-center md:placeholder:text-left"
                  />
                </FormControl>
                <FormMessage className="mt-1" />
              </FormItem>
            )}
          />
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
                    placeholder="Digite seu e-mail"
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
              <FormItem className="gap-0 [&_button]:text-line-strong md:[&_button]:text-khaki">
                <FormLabel className="sr-only">Senha</FormLabel>
                <FormControl>
                  <PasswordInput
                    {...field}
                    onBlur={deferBlurForSubmit(field.onBlur)}
                    autoComplete="new-password"
                    placeholder="Senha"
                    required
                    sizeVariant="responsive"
                    className="text-sm"
                  />
                </FormControl>
                <FormMessage className="mt-1" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem className="gap-0 [&_button]:text-line-strong md:[&_button]:text-khaki">
                <FormLabel className="sr-only">Confirmar senha</FormLabel>
                <FormControl>
                  <PasswordInput
                    {...field}
                    onBlur={deferBlurForSubmit(field.onBlur)}
                    autoComplete="new-password"
                    placeholder="Confirmar senha"
                    required
                    sizeVariant="responsive"
                    className="text-sm"
                  />
                </FormControl>
                <FormMessage className="mt-1" />
              </FormItem>
            )}
          />
        </fieldset>
        <Button
          type="submit"
          loading={busy}
          className="mt-10 h-[60px] w-full rounded-xl md:mt-6 md:h-[45px] md:rounded-[5px]"
        >
          <span className="md:hidden">Criar perfil</span>
          <span className="hidden md:inline">Criar conta</span>
        </Button>
      </form>
    </Form>
  )
}
