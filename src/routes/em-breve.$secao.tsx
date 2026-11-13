import { createFileRoute } from '@tanstack/react-router'

import { ComingSoonPage } from '@/app/coming-soon-page'

export const Route = createFileRoute('/em-breve/$secao')({
  component: ComingSoonRoute,
})

function ComingSoonRoute() {
  const { secao } = Route.useParams()
  return <ComingSoonPage section={secao} />
}
