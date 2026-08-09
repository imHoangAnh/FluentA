import type { ComponentType } from 'react'
import type { RouteObject } from 'react-router-dom'
import { appShellRoute } from '@/shared/components/layout/app-shell-route'

export const dashboardRoutes: RouteObject[] = [{
  index: true,
  handle: appShellRoute({ title: 'Overview', contentClassName: 'h-screen max-w-none min-h-0 overflow-hidden p-3 lg:p-4' }),
  lazy: async () => ({
    Component: (await import('./pages/DashboardPage')).DashboardPage as ComponentType,
  }),
}]
