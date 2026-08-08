import type { RouteObject } from 'react-router-dom'
import { appShellRoute } from '@/shared/components/layout/app-shell-route'

export const countdownRoutes: RouteObject[] = [{
  path: 'countdowns',
  handle: appShellRoute({
    title: 'Countdowns',
    description: 'Track important dates and reminder alerts.',
    contentClassName: 'h-screen max-w-none overflow-hidden p-3 lg:p-4',
  }),
  lazy: async () => ({ Component: (await import('./pages/CountdownPage')).CountdownPage }),
}]
