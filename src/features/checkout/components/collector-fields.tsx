import { useCallback, useEffect } from 'react'
import { useWatch, type UseFormReturn } from 'react-hook-form'

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ENS_SUFFIXES,
  addressHint,
  isValidAddress,
  type Collector,
  type CollectorInput,
} from '@/contracts'

export type CollectorForm = UseFormReturn<CollectorInput, unknown, Collector>

export interface CollectorFieldsProps {
  form: CollectorForm
  /** The address comes from a registered wallet and cannot be typed over. */
  addressLocked: boolean
}

/** Field box of the frame: 39px high, 1px line border, 3px radius. */
const FIELD = 'rounded-[3px]'

/**
 * The ten fields of "Perfil do colecionador" in the payment frame, on its
 * two-column grid (one column on small screens). Labels, placeholders and the
 * required marks are the ones drawn in the Figma.
 */
export function CollectorFields({ form, addressLocked }: CollectorFieldsProps) {
  const network = useWatch({ control: form.control, name: 'network' })
  const { trigger, getValues, setError } = form

  // The address rule depends on the network (0x… vs Solana base58): re-check the
  // address whenever the network changes, even in a partially filled form.
  const validateAddress = useCallback(async () => {
    await trigger('walletAddress')
    const current = getValues()
    if (
      current.network &&
      current.walletAddress &&
      !isValidAddress(current.walletAddress.trim(), current.network)
    ) {
      setError('walletAddress', { type: 'network', message: addressHint(current.network) })
    }
  }, [trigger, getValues, setError])

  useEffect(() => {
    if (getValues('walletAddress')) void validateAddress()
  }, [network, getValues, validateAddress])

  return (
    <div className="grid min-w-0 gap-x-[25px] gap-y-[15px] md:grid-cols-2">
      <FormField
        control={form.control}
        name="displayName"
        render={({ field }) => (
          <FormItem className="gap-0.5">
            <FormLabel required>Nome de exibição</FormLabel>
            <FormControl>
              <Input {...field} required autoComplete="name" className={FIELD} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="username"
        render={({ field }) => (
          <FormItem className="gap-0.5">
            <FormLabel required>Nome de usuário</FormLabel>
            <FormControl>
              <Input
                {...field}
                required
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                className={FIELD}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="network"
        render={({ field }) => (
          <FormItem className="gap-0.5">
            <FormLabel required>Rede</FormLabel>
            <Select value={field.value ?? ''} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger ref={field.ref} onBlur={field.onBlur} className={FIELD}>
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
          <FormItem className="gap-0.5">
            <FormLabel required>Nome do perfil</FormLabel>
            <FormControl>
              <Input {...field} required autoComplete="off" className={FIELD} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="walletAddress"
        render={({ field }) => (
          <FormItem className="gap-0.5">
            <FormLabel required>Endereço da carteira</FormLabel>
            <FormControl>
              <Input
                {...field}
                required
                readOnly={addressLocked}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                onBlur={() => {
                  field.onBlur()
                  void validateAddress()
                }}
                placeholder={
                  network === 'solana' ? 'Endereço Solana da carteira' : 'Endereço 0x da carteira'
                }
                className={`${FIELD} read-only:text-sand`}
              />
            </FormControl>
            <FormDescription className="text-xs leading-4 text-khaki">
              {addressLocked
                ? 'Endereço da carteira cadastrada selecionada.'
                : addressHint(network)}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="secondaryAddress"
        render={({ field }) => (
          // No visible label in the frame: the field lines up with its neighbour.
          <FormItem className="gap-0.5 self-start md:pt-[26px]">
            <FormLabel className="sr-only">ENS ou carteira secundária (opcional)</FormLabel>
            <FormControl>
              <Input
                {...field}
                value={field.value ?? ''}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="ENS ou carteira secundária (opcional)"
                className={FIELD}
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
          <FormItem className="gap-0.5">
            <FormLabel required>Tipo de carteira</FormLabel>
            <Select value={field.value ?? ''} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger ref={field.ref} onBlur={field.onBlur} className={FIELD}>
                  <SelectValue placeholder="Selecione uma carteira" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="walletconnect">WalletConnect</SelectItem>
                <SelectItem value="metamask">MetaMask</SelectItem>
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
          <FormItem className="gap-0.5">
            <FormLabel required>Código de indicação</FormLabel>
            <FormControl>
              <Input
                {...field}
                required
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                className={FIELD}
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
          <FormItem className="gap-0.5">
            <FormLabel required>E-mail</FormLabel>
            <FormControl>
              <Input {...field} required type="email" autoComplete="email" className={FIELD} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="ensName"
        render={({ field }) => (
          <FormItem className="gap-0.5">
            <FormLabel required>Nome ENS</FormLabel>
            <div className="flex gap-[11px]">
              <FormField
                control={form.control}
                name="ensSuffix"
                render={({ field: suffix }) => (
                  <FormItem className="w-[77px] shrink-0 gap-0.5">
                    <FormLabel className="sr-only">Sufixo do nome ENS</FormLabel>
                    <Select value={suffix.value} onValueChange={suffix.onChange}>
                      <FormControl>
                        <SelectTrigger
                          ref={suffix.ref}
                          onBlur={suffix.onBlur}
                          className={`w-[77px] px-2 text-15 ${FIELD}`}
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
                  </FormItem>
                )}
              />
              <div className="min-w-0 flex-1">
                <FormControl>
                  <Input
                    {...field}
                    required
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    className={FIELD}
                  />
                </FormControl>
              </div>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
