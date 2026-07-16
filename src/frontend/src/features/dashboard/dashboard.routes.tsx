import type { ComponentType } from 'react'
import type { RouteObject } from 'react-router-dom'
import { appShellRoute } from '@/shared/components/layout/app-shell-route'

export const dashboardRoutes: RouteObject[] = [{
  index: true,
  handle: appShellRoute({ title: 'Overview' }),
  lazy: async () => ({
    Component: (await import('./pages/DashboardPage')).DashboardPage as ComponentType,
  }),
}]
