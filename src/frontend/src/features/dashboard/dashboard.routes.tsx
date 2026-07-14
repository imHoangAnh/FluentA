import type { ComponentType } from 'react'
import type { RouteObject } from 'react-router-dom'

export const dashboardRoutes: RouteObject[] = [{
  index: true,
  lazy: async () => ({
    Component: (await import('./pages/DashboardPage')).DashboardPage as ComponentType,
  }),
}]
