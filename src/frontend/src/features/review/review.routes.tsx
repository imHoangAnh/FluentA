import type { RouteObject } from 'react-router-dom'
import { appShellRoute } from '@/shared/components/layout/app-shell-route'

export const reviewRoutes: RouteObject[] = [{
  path: 'review',
  handle: appShellRoute({
    title: 'Review',
    contentClassName: 'h-screen min-h-0 overflow-hidden p-3 lg:p-4',
  }),
  lazy: async () => ({ Component: (await import('./ReviewSessionPage')).ReviewSessionPage }),
}]
