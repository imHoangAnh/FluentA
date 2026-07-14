import type { ComponentType } from 'react'
import type { RouteObject } from 'react-router-dom'

export const vocabularyRoutes: RouteObject[] = [{
  path: 'vocabulary',
  lazy: async () => ({ Component: (await import('./pages/WorkspacePage')).WorkspacePage as ComponentType }),
}]
