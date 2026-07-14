import type { ComponentType } from 'react'
import type { RouteObject } from 'react-router-dom'

export const notificationsRoutes: RouteObject[] = [{
  path: 'notifications',
  lazy: async () => ({ Component: (await import('./pages/NotificationsPage')).NotificationsPage as ComponentType }),
}]
