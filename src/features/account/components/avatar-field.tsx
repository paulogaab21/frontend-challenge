import { useId, useRef, useState } from 'react'
import { AVATAR_MAX_BYTES, AVATAR_MIME_TYPES, type Profile } from '@/contracts'
import { ImageIcon } from '@/components/icons'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
export interface AvatarFieldProps {
  avatarUrl: Profile['avatarUrl']
  displayName: Profile['displayName']
  onSelect: (file: File) => void
  onRemove: () => void
  pending?: boolean
  error?: string
  onValidationError?: (message: string) => void
}
export function AvatarField({
  avatarUrl,
  displayName,
  onSelect,
  onRemove,
  pending,
  error,
  onValidationError,
}: AvatarFieldProps) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const [validationError, setValidationError] = useState<string>()
  const message = error ?? validationError
  return (
    <div>
      <p className="text-15 leading-6">Avatar</p>
      <div className="mt-1 flex flex-wrap items-center gap-6">
        <Avatar className="size-[50px] border border-line">
          <AvatarImage src={avatarUrl ?? undefined} alt={`Avatar de ${displayName}`} />
          <AvatarFallback className="bg-surface-raised text-copper">
            <ImageIcon size={24} />
          </AvatarFallback>
        </Avatar>
        <input
          ref={input}
          id={id}
          type="file"
          accept={AVATAR_MIME_TYPES.join(',')}
          className="sr-only"
          tabIndex={-1}
          aria-label="Selecionar avatar"
          disabled={pending}
          aria-describedby={message ? `${id}-error` : undefined}
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (!file) return
            const next = !AVATAR_MIME_TYPES.some((type) => type === file.type)
              ? 'Escolha uma imagem PNG, JPEG ou WebP.'
              : file.size > AVATAR_MAX_BYTES
                ? 'A imagem deve ter no máximo 2 MB.'
                : undefined
            setValidationError(next)
            if (next) {
              onValidationError?.(next)
              return
            }
            onSelect(file)
          }}
        />
        <Button
          className="w-[98px] rounded-[3px] text-sm"
          onClick={() => input.current?.click()}
          loading={pending}
        >
          Alterar
        </Button>
        <Button
          variant="ghost"
          className="h-10 px-0 text-sm font-normal"
          onClick={() => {
            setValidationError(undefined)
            onRemove()
          }}
          disabled={pending || !avatarUrl}
        >
          Remover
        </Button>
      </div>
      {message && (
        <p id={`${id}-error`} role="alert" className="mt-2 text-xs text-coral">
          {message}
        </p>
      )}
    </div>
  )
}
