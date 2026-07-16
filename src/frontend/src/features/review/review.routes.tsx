import type { RouteObject } from 'react-router-dom'
import { appShellRoute } from '@/shared/components/layout/app-shell-route'

export const reviewRoutes: RouteObject[] = [{
  path: 'review',
  handle: appShellRoute({
    title: 'Review',
    description: 'Practice your due words and keep your learning streak moving.',
  }),
  lazy: async () => ({ Component: (await import('./ReviewSessionPage')).ReviewSessionPage }),
}]
