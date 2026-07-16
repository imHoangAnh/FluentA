import type { ComponentType } from 'react'
import type { RouteObject } from 'react-router-dom'
import { appShellRoute } from '@/shared/components/layout/app-shell-route'

export const vocabularyRoutes: RouteObject[] = [{
  path: 'vocabulary',
  handle: appShellRoute({ title: 'Vocabulary', contentClassName: 'h-screen max-w-none' }),
  lazy: async () => ({ Component: (await import('./pages/WorkspacePage')).WorkspacePage as ComponentType }),
}]
