import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from '@/components/ui/pagination'
import { ArrowLeft2Icon, ArrowRight2Icon } from '@/components/icons'
import { SiteLink } from '@/components/layout/site-link'
export interface CatalogPaginationProps {
  page: number
  totalPages: number
  getHref: (page: number) => string
  onNavigate?: (page: number) => void
}
export function CatalogPagination({
  page,
  totalPages,
  getHref,
  onNavigate,
}: CatalogPaginationProps) {
  if (totalPages < 2) return null
  const pages = [
    ...new Set([
      1,
      totalPages,
      ...Array.from({ length: totalPages <= 5 ? totalPages : 3 }, (_, i) =>
        totalPages <= 5 ? i + 1 : Math.min(Math.max(page - 1, 2), Math.max(2, totalPages - 3)) + i,
      ),
    ]),
  ]
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b)
  const notify = (target: number) => (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button === 0)
      onNavigate?.(target)
  }
  return (
    <Pagination aria-label="Paginação do catálogo" className="justify-end">
      <PaginationContent>
        {page > 1 && (
          <PaginationItem>
            <PaginationLink asChild aria-label="Página anterior">
              <SiteLink to={getHref(page - 1)} onClick={notify(page - 1)}>
                <ArrowLeft2Icon />
              </SiteLink>
            </PaginationLink>
          </PaginationItem>
        )}
        {pages.flatMap((number, index) => [
          index > 0 && number - (pages[index - 1] ?? 0) > 1 ? (
            <PaginationItem key={`gap-${number}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : null,
          <PaginationItem key={number}>
            <PaginationLink asChild isActive={number === page}>
              <SiteLink
                to={getHref(number)}
                onClick={notify(number)}
                aria-label={`Página ${number}`}
              >
                {number}
              </SiteLink>
            </PaginationLink>
          </PaginationItem>,
        ])}
        {page < totalPages && (
          <PaginationItem>
            <PaginationLink asChild aria-label="Próxima página">
              <SiteLink to={getHref(page + 1)} onClick={notify(page + 1)}>
                <ArrowRight2Icon />
              </SiteLink>
            </PaginationLink>
          </PaginationItem>
        )}
      </PaginationContent>
    </Pagination>
  )
}
