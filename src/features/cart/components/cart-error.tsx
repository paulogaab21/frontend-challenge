import { AlertIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'

export interface CartErrorProps {
  message: string
  onRetry: () => void
}

export function CartError({ message, onRetry }: CartErrorProps) {
  return (
    <section
      role="alert"
      className="flex min-h-[274px] flex-col items-center justify-center gap-4 rounded-lg border border-line-strong bg-surface p-6 text-center"
    >
      <AlertIcon size={40} className="text-coral" />
      <h2 className="text-xl font-bold">Não foi possível carregar seu carrinho</h2>
      <p className="text-sm text-sand">{message}</p>
      <Button onClick={onRetry}>Tentar novamente</Button>
    </section>
  )
}
