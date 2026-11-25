import type { ComponentType } from 'react'
import type { RouteObject } from 'react-router-dom'
import { appShellRoute } from '@/shared/components/layout/app-shell-route'

export const dashboardRoutes: RouteObject[] = [{
  index: true,
  handle: appShellRoute({ title: 'Overview', contentClassName: 'max-w-none px-4 py-6 sm:px-8 lg:px-12 xl:px-20 lg:pt-7 lg:pb-10' }),
  lazy: async () => ({
    Component: (await import('./pages/DashboardPage')).DashboardPage as ComponentType,
  }),
}]
