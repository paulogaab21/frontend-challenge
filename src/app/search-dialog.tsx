import { useNavigate } from '@tanstack/react-router'
import { useId, type FormEvent } from 'react'

import { SearchIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

interface SearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Term currently applied to the catalog, if any. */
  defaultValue?: string
}

/**
 * Catalog search opened from the header's magnifier. Submitting navigates to the
 * home page with `?q=` — the search term is URL state like every other filter.
 */
export function SearchDialog({ open, onOpenChange, defaultValue = '' }: SearchDialogProps) {
  const navigate = useNavigate()
  const inputId = useId()

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = new FormData(event.currentTarget).get('q')
    const q = typeof value === 'string' ? value.trim() : ''
    onOpenChange(false)
    void navigate({ to: '/', search: q ? { q } : {}, hash: 'mercado' })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[20%] w-[calc(100vw-2rem)] max-w-[560px] translate-y-0 px-8 pt-10 pb-10">
        <DialogHeader>
          <DialogTitle>Buscar NFTs</DialogTitle>
          <DialogDescription>
            Procure por nome, coleção, atributo ou número do token.
          </DialogDescription>
        </DialogHeader>
        <form role="search" onSubmit={submit} className="mt-5 flex gap-2">
          <label htmlFor={inputId} className="sr-only">
            Termo de busca
          </label>
          <div className="relative min-w-0 flex-1">
            <SearchIcon
              size={16}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-khaki"
            />
            <Input
              id={inputId}
              name="q"
              type="search"
              defaultValue={defaultValue}
              placeholder="Ex.: Golden, Kurio Apes, #042"
              autoComplete="off"
              enterKeyHint="search"
              maxLength={80}
              className="pl-9"
            />
          </div>
          <Button type="submit">Buscar</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
