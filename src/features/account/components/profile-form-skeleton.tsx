import { Skeleton } from '@/components/ui/skeleton'
export interface ProfileFormSkeletonProps {
  includePassword?: boolean
}
export function ProfileFormSkeleton({ includePassword = true }: ProfileFormSkeletonProps) {
  return (
    <div role="status" aria-label="Carregando perfil">
      <Skeleton className="h-6 w-56" />
      <div className="mt-6 grid gap-x-7 gap-y-6 md:grid-cols-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i}>
            <Skeleton className="h-6 w-36" />
            <Skeleton
              className={i === 5 ? 'mt-1 h-[50px] w-[50px] rounded-full' : 'mt-4 h-10 w-full'}
            />
          </div>
        ))}
      </div>
      <Skeleton className="mt-8 h-10 w-[131px]" />
      {includePassword && (
        <div className="mt-8">
          <Skeleton className="h-6 w-36" />
          <div className="mt-5 max-w-[417px] space-y-6">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i}>
                <Skeleton className="h-6 w-40" />
                <Skeleton className="mt-2 h-10 w-full" />
              </div>
            ))}
          </div>
          <Skeleton className="mt-8 h-10 w-[131px]" />
        </div>
      )}
      <span className="sr-only">Carregando perfil</span>
    </div>
  )
}
