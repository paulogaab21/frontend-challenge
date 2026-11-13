import { deferBlurForSubmit } from '@/features/auth/components/defer-blur-for-submit'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FormServerFeedback } from '@/features/auth/components/form-server-feedback'
import { useServerErrors } from '@/features/auth/components/use-server-errors'
import type { ReactNode } from 'react'
import {
  ENS_SUFFIXES,
  updateProfileRequestSchema,
  type Profile,
  type UpdateProfileRequest,
} from '@/contracts'
export interface ProfileFormProps {
  defaultValues: Profile
  onSubmit: (values: UpdateProfileRequest) => Promise<void> | void
  pending?: boolean
  formError?: string
  fieldErrors?: Record<string, string>
  successMessage?: string
  avatarField?: ReactNode
}
const fields = [
  'displayName',
  'username',
  'email',
  'ensName',
  'ensSuffix',
  'walletNickname',
] as const
export function ProfileForm({
  defaultValues,
  onSubmit,
  pending,
  formError,
  fieldErrors,
  successMessage,
  avatarField,
}: ProfileFormProps) {
  const form = useForm<UpdateProfileRequest>({
    resolver: zodResolver(updateProfileRequestSchema),
    defaultValues,
    mode: 'onBlur',
    shouldFocusError: true,
  })
  useServerErrors({ form, fieldErrors, fieldNames: fields, formError })
  const busy = pending || form.formState.isSubmitting
  return (
    <Form {...form}>
      <form
        noValidate
        aria-label="Perfil do colecionador"
        onSubmit={form.handleSubmit(async (values) => {
          try {
            await onSubmit(values)
          } catch {
            /* Parent owns transport feedback. */
          }
        })}
      >
        <h1 className="text-base leading-6 font-bold">Perfil do colecionador</h1>
        <div className="mt-6">
          <FormServerFeedback error={formError} successMessage={successMessage} />
        </div>
        <fieldset disabled={pending} className="mt-6 grid min-w-0 gap-x-7 gap-y-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="displayName"
            render={({ field }) => (
              <FormItem className="gap-4">
                <FormLabel required className="">
                  Nome de exibição
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    onBlur={deferBlurForSubmit(field.onBlur)}
                    required
                    autoComplete="name"
                    className="rounded-[3px]"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem className="gap-4">
                <FormLabel required className="">
                  Nome de usuário
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    onBlur={deferBlurForSubmit(field.onBlur)}
                    required
                    autoComplete="username"
                    className="rounded-[3px]"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="gap-4">
                <FormLabel required className="">
                  E-mail
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    onBlur={deferBlurForSubmit(field.onBlur)}
                    required
                    type="email"
                    autoComplete="email"
                    className="rounded-[3px]"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="">
            <FormField
              control={form.control}
              name="ensName"
              render={({ field }) => (
                <FormItem className="gap-4">
                  <FormLabel required>Nome ENS</FormLabel>
                  <div className="flex gap-[11px]">
                    <FormField
                      control={form.control}
                      name="ensSuffix"
                      render={({ field: suffix }) => (
                        <FormItem className="w-[77px] shrink-0 gap-0">
                          <FormLabel className="sr-only">Sufixo ENS</FormLabel>
                          <Select value={suffix.value} onValueChange={suffix.onChange}>
                            <FormControl>
                              <SelectTrigger
                                onBlur={deferBlurForSubmit(suffix.onBlur)}
                                ref={suffix.ref}
                                className="w-[77px] rounded-[3px] px-2"
                              >
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {ENS_SUFFIXES.map((value) => (
                                <SelectItem key={value} value={value}>
                                  {value}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <FormControl>
                        <Input
                          {...field}
                          onBlur={deferBlurForSubmit(field.onBlur)}
                          required
                          autoComplete="off"
                          className="rounded-[3px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </div>
                  </div>
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="walletNickname"
            render={({ field }) => (
              <FormItem className="gap-4">
                <FormLabel required className="">
                  Apelido da carteira
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    onBlur={deferBlurForSubmit(field.onBlur)}
                    required
                    autoComplete="off"
                    className="rounded-[3px]"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="min-w-0">{avatarField}</div>
        </fieldset>
        <Button type="submit" className="mt-8 w-[131px] rounded-[3px] text-sm" loading={busy}>
          Salvar
        </Button>
      </form>
    </Form>
  )
}
