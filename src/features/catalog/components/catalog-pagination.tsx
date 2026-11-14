import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from '@/components/ui/pagination'
import { ArrowLeft2Icon, ArrowRight2Icon } from '@/components/icons'
import { SiteLink } from '@/components/layout/site-link'
/** Number of page links shown at once. */
const PAGE_WINDOW = 4

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
  // Four consecutive pages, as drawn in the layout ("1 2 3 4 >"): the window slides
  // with the current page and the arrows reach everything outside it.
  const first = Math.max(1, Math.min(page - 1, totalPages - (PAGE_WINDOW - 1)))
  const pages = Array.from(
    { length: Math.min(PAGE_WINDOW, totalPages) },
    (_, index) => first + index,
  )
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
        {pages.map((number) => (
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
          </PaginationItem>
        ))}
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
