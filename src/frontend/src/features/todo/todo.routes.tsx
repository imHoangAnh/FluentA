import type { RouteObject } from 'react-router-dom'
import { appShellRoute } from '@/shared/components/layout/app-shell-route'

export const todoRoutes: RouteObject[] = [{
  path: 'todo',
  handle: appShellRoute({
    title: 'Todo',
    description: 'Plan the day, then finish the work that matters.',
  }),
  lazy: async () => ({ Component: (await import('./pages/TodoPage')).TodoPage }),
}]
