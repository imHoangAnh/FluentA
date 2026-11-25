import type { RouteObject } from 'react-router-dom'
import { appShellRoute } from '@/shared/components/layout/app-shell-route'

export const analyticsRoutes: RouteObject[] = [
  {
    path: 'analytics',
    handle: appShellRoute({
      title: 'Analytics',
      description: 'Retention health, mastery progression, and speech accuracy across your study sessions.',
      contentClassName: 'analytics-page-main',
    }),
    lazy: async () => ({ Component: (await import('./pages/AnalyticsPage')).AnalyticsPage }),
  },
]
