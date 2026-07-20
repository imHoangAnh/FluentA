import type { RouteObject } from 'react-router-dom'
import { appShellRoute } from '@/shared/components/layout/app-shell-route'

export const reviewRoutes: RouteObject[] = [{
  path: 'review',
  handle: appShellRoute({
    title: 'Review',
  }),
  lazy: async () => ({ Component: (await import('./ReviewSessionPage')).ReviewSessionPage }),
}]
