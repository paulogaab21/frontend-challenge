import { Skeleton } from '@/components/ui/skeleton'
export interface AuthFormSkeletonProps {
  mode?: 'login' | 'register'
}
export function AuthFormSkeleton({ mode = 'login' }: AuthFormSkeletonProps) {
  return (
    <div role="status" aria-label="Carregando formulário">
      <div className="space-y-3">
        {Array.from({ length: mode === 'login' ? 2 : 4 }, (_, index) => (
          <Skeleton key={index} className="h-[50px] rounded-xl md:h-10 md:rounded-[5px]" />
        ))}
        {mode === 'login' && (
          <div className="flex h-6 justify-end">
            <Skeleton className="h-5 w-36" />
          </div>
        )}
      </div>
      <Skeleton
        className={
          mode === 'login'
            ? 'mt-8 h-[60px] rounded-xl md:mt-4 md:h-[45px] md:rounded-[5px]'
            : 'mt-10 h-[60px] rounded-xl md:mt-6 md:h-[45px] md:rounded-[5px]'
        }
      />
      <span className="sr-only">Carregando formulário</span>
    </div>
  )
}
