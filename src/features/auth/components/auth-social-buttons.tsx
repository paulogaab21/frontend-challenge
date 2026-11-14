import { FacebookBrandIcon, GoogleIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
export interface AuthSocialButtonsProps {
  onSelect: (provider: 'google' | 'facebook') => void
  notice?: string
  disabled?: boolean
  mode?: 'login' | 'register'
}
export function AuthSocialButtons({
  onSelect,
  notice,
  disabled,
  mode = 'login',
}: AuthSocialButtonsProps) {
  return (
    <div>
      <div className="flex h-4 items-center gap-[10px] md:gap-3">
        <Separator className="w-auto flex-1" />
        <span className="shrink-0 text-13 leading-4">Ou continue com</span>
        <Separator className="w-auto flex-1" />
      </div>
      <div
        className={cn(
          'mx-auto mt-3 w-full space-y-4 md:max-w-[340px] md:space-y-3',
          mode === 'register' && 'md:mt-4 md:space-y-4',
        )}
      >
        <Button
          variant="social"
          className="w-full gap-[12.5px] rounded-[5px] pr-[38.5px] md:gap-3 md:rounded-[5px] md:pr-5"
          onClick={() => onSelect('google')}
          disabled={disabled}
        >
          <GoogleIcon />
          Continuar com Google
        </Button>
        <Button
          variant="social"
          className="w-full gap-[12.5px] rounded-[5px] pr-[38.5px] md:gap-3 md:rounded-[5px] md:pr-5"
          onClick={() => onSelect('facebook')}
          disabled={disabled}
        >
          <FacebookBrandIcon />
          Continuar com Facebook
        </Button>
      </div>
      {notice && (
        <p role="status" className="mx-auto mt-3 max-w-[340px] text-13 leading-5 text-sand">
          {notice}
        </p>
      )}
      <span className="sr-only">
        {mode === 'login' ? 'Opções para entrar' : 'Opções para criar conta'}
      </span>
    </div>
  )
}
