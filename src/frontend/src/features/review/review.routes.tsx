import type { RouteObject } from 'react-router-dom'
import { appShellRoute } from '@/shared/components/layout/app-shell-route'

export const reviewRoutes: RouteObject[] = [{
  path: 'review',
  handle: appShellRoute({
    title: 'Review',
    contentClassName: 'learning-figma-main',
  }),
  lazy: async () => ({ Component: (await import('./pages/ReviewSessionPage')).ReviewSessionPage }),
}]

export const reviewSessionRoutes: RouteObject[] = [{
  path: 'review/sessions/:sessionId',
  handle: appShellRoute({
    title: 'Review session',
    contentClassName: 'learning-figma-main',
  }),
  lazy: async () => ({ Component: (await import('./pages/ReviewSessionPage')).ReviewSessionPage }),
}]
