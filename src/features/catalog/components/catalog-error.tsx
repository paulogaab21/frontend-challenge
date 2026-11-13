import { AlertIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
export interface CatalogErrorProps {
  message: string
  onRetry: () => void
  pending?: boolean
}
export function CatalogError({ message, onRetry, pending }: CatalogErrorProps) {
  return (
    <div
      role="alert"
      className="flex min-h-[364px] flex-col items-center justify-center gap-4 rounded-lg border border-coral p-6 text-center"
    >
      <AlertIcon size={32} className="text-coral" />
      <h2 className="text-xl font-bold">Não foi possível carregar os NFTs</h2>
      <p className="max-w-md text-sand">{message}</p>
      <Button onClick={onRetry} loading={pending}>
        Tentar novamente
      </Button>
    </div>
  )
}
