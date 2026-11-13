import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'

import { AppEffects } from '@/app/app-effects'
import { RouteAnnouncer } from '@/app/route-announcer'
import { NotFoundPage, RouteErrorPage } from '@/app/route-fallbacks'
import type { RouterContext } from '@/app/router'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
  errorComponent: RouteErrorPage,
})

function RootLayout() {
  return (
    <TooltipProvider>
      <Outlet />
      {/* One toaster for the whole app: it is the live region for mutations and
          real-time changes. */}
      <Toaster />
      <RouteAnnouncer />
      <AppEffects />
    </TooltipProvider>
  )
}
