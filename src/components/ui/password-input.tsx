import { useState } from 'react'
import { HideIcon } from '@/components/icons/hide-icon'
import { ShowIcon } from '@/components/icons/show-icon'
import { Input, type InputProps } from '@/components/ui/input'
import { cn } from '@/components/ui/class-names'

export function PasswordInput({
  className,
  disabled,
  sizeVariant,
  ...props
}: Omit<InputProps, 'type'>) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative w-full">
      <Input
        {...props}
        type={visible ? 'text' : 'password'}
        disabled={disabled}
        sizeVariant={sizeVariant}
        className={cn('pr-12 text-base', className)}
      />
      <button
        type="button"
        disabled={disabled}
        aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
        aria-pressed={visible}
        aria-controls={props.id}
        onClick={() => setVisible((current) => !current)}
        className="absolute inset-y-0 right-1 my-auto flex size-9 items-center justify-center rounded-sm text-khaki hover:text-amber disabled:cursor-not-allowed disabled:opacity-50"
      >
        {visible ? <ShowIcon size={20} /> : <HideIcon size={20} />}
      </button>
    </div>
  )
}
