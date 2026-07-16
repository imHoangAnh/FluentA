import type { ComponentType } from 'react'
import type { RouteObject } from 'react-router-dom'
import { appShellRoute } from '@/shared/components/layout/app-shell-route'

export const notificationsRoutes: RouteObject[] = [{
  path: 'notifications',
  handle: appShellRoute({
    title: 'Notifications',
    description: 'Keep up with reminders and completed countdowns.',
  }),
  lazy: async () => ({ Component: (await import('./pages/NotificationsPage')).NotificationsPage as ComponentType }),
}]
