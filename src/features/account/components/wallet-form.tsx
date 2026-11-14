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
  FormDescription,
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
import { useCallback, useEffect } from 'react'
import { useWatch } from 'react-hook-form'
import {
  ENS_SUFFIXES,
  addressHint,
  isValidAddress,
  walletFieldsSchema,
  type WalletFields,
  type WalletFieldsInput,
} from '@/contracts'
export interface WalletFormProps {
  defaultValues?: Partial<WalletFieldsInput>
  onSubmit: (values: WalletFields) => Promise<void> | void
  onCancel?: () => void
  pending?: boolean
  formError?: string
  fieldErrors?: Record<string, string>
  submitLabel?: string
}
const fields = [
  'displayName',
  'nickname',
  'network',
  'profileName',
  'address',
  'secondaryAddress',
  'provider',
  'referralCode',
  'email',
  'ensName',
  'ensSuffix',
] as const
export function WalletForm({
  defaultValues,
  onSubmit,
  onCancel,
  pending,
  formError,
  fieldErrors,
  submitLabel = 'Salvar carteira',
}: WalletFormProps) {
  const form = useForm<WalletFieldsInput, unknown, WalletFields>({
    resolver: zodResolver(walletFieldsSchema, {
      error: (issue) => {
        if (issue.path?.[0] === 'network' && issue.code === 'invalid_value')
          return 'Selecione uma rede'
        if (issue.path?.[0] === 'provider' && issue.code === 'invalid_value')
          return 'Selecione uma carteira'
        return undefined
      },
    }),
    defaultValues: {
      displayName: '',
      nickname: '',
      profileName: '',
      address: '',
      secondaryAddress: '',
      referralCode: '',
      email: '',
      ensName: '',
      ensSuffix: '.eth',
      ...defaultValues,
    },
    mode: 'onBlur',
    shouldFocusError: true,
  })
  useServerErrors({ form, fieldErrors, fieldNames: fields, formError })
  const network = useWatch({ control: form.control, name: 'network' })
  const { trigger, getValues, setError } = form
  const validateAddress = useCallback(async () => {
    await trigger(['address', 'secondaryAddress'])
    const current = getValues()
    // Zod can defer object refinements while a required enum is empty. Keep the
    // network-dependent address rule responsive even in a partially filled form.
    if (
      current.network &&
      current.address &&
      !isValidAddress(current.address.trim(), current.network)
    ) {
      setError('address', { type: 'network', message: addressHint(current.network) })
    }
  }, [trigger, getValues, setError])
  useEffect(() => {
    if (getValues('address')) void validateAddress()
  }, [network, getValues, validateAddress])
  const busy = pending || form.formState.isSubmitting
  return (
    <Form {...form}>
      <form
        noValidate
        aria-label="Dados da carteira"
        onSubmit={form.handleSubmit(async (values) => {
          try {
            await onSubmit(values)
          } catch {
            /* Parent owns transport feedback. */
          }
        })}
      >
        <FormServerFeedback error={formError} />
        <fieldset disabled={pending} className="grid min-w-0 gap-x-7 gap-y-[25px] md:grid-cols-2">
          <FormField
            control={form.control}
            name="displayName"
            render={({ field }) => (
              <FormItem className="gap-0">
                <FormLabel required className="">
                  Nome de exibição
                </FormLabel>
                <FormControl>
                  <Input {...field} required autoComplete="name" className="rounded-[3px]" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="nickname"
            render={({ field }) => (
              <FormItem className="gap-0">
                <FormLabel required className="">
                  Apelido da carteira
                </FormLabel>
                <FormControl>
                  <Input {...field} required autoComplete="off" className="rounded-[3px]" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="network"
            render={({ field }) => (
              <FormItem className="gap-0">
                <FormLabel required>Rede</FormLabel>
                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger
                      onBlur={deferBlurForSubmit(field.onBlur)}
                      ref={field.ref}
                      className="rounded-[3px]"
                    >
                      <SelectValue placeholder="Selecione uma rede" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="ethereum">Ethereum</SelectItem>
                    <SelectItem value="polygon">Polygon</SelectItem>
                    <SelectItem value="solana">Solana</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="profileName"
            render={({ field }) => (
              <FormItem className="gap-0">
                <FormLabel required className="">
                  Nome do perfil
                </FormLabel>
                <FormControl>
                  <Input {...field} required autoComplete="off" className="rounded-[3px]" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem className="gap-0">
                <FormLabel required>Endereço da carteira</FormLabel>
                <FormControl>
                  <Input
                    {...field}

                    required
                    autoComplete="off"
                    onBlur={deferBlurForSubmit(() => {
                      field.onBlur()
                      void validateAddress()
                    })}
                    placeholder={
                      network === 'solana'
                        ? 'Endereço Solana da carteira'
                        : 'Endereço 0x da carteira'
                    }
                    className="rounded-[3px]"
                  />
                </FormControl>
                <FormDescription className="sr-only">{addressHint(network)}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="secondaryAddress"
            render={({ field }) => (
              <FormItem className="gap-0 self-start pt-6">
                <FormLabel className="sr-only">ENS ou carteira secundária (opcional)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    onBlur={deferBlurForSubmit(field.onBlur)}
                    value={field.value ?? ''}
                    autoComplete="off"
                    placeholder="ENS ou carteira secundária (opcional)"
                    className="rounded-[3px]"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="provider"
            render={({ field }) => (
              <FormItem className="gap-0">
                <FormLabel required>Tipo de carteira</FormLabel>
                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger
                      onBlur={deferBlurForSubmit(field.onBlur)}
                      ref={field.ref}
                      className="rounded-[3px]"
                    >
                      <SelectValue placeholder="Selecione uma carteira" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="metamask">MetaMask</SelectItem>
                    <SelectItem value="walletconnect">WalletConnect</SelectItem>
                    <SelectItem value="coinbase">Coinbase Wallet</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="referralCode"
            render={({ field }) => (
              <FormItem className="gap-0">
                <FormLabel required className="">
                  Código de indicação
                </FormLabel>
                <FormControl>
                  <Input {...field} required autoComplete="off" className="rounded-[3px]" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="gap-0">
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
                <FormItem className="gap-0">
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
                        <Input {...field} required autoComplete="off" className="rounded-[3px]" />
                      </FormControl>
                      <FormMessage />
                    </div>
                  </div>
                </FormItem>
              )}
            />
          </div>
        </fieldset>
        <div className="mt-8 flex gap-3">
          <Button type="submit" className="w-[131px] rounded-[3px] px-0 text-sm" loading={busy}>
            {submitLabel}
          </Button>
          {onCancel && (
            <Button variant="outline" onClick={onCancel} disabled={busy}>
              Cancelar
            </Button>
          )}
        </div>
      </form>
    </Form>
  )
}
