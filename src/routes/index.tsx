import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <main className="container-page py-24">
      <p className="text-sm font-bold tracking-brand">KURIO</p>
      <h1 className="mt-6 text-hero font-bold">SEJA DONO DO FUTURO DA ARTE DIGITAL</h1>
    </main>
  )
}
