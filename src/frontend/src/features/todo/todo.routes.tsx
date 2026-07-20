import type { RouteObject } from 'react-router-dom'
import { appShellRoute } from '@/shared/components/layout/app-shell-route'

export const todoRoutes: RouteObject[] = [{
  path: 'todo',
  handle: appShellRoute({
    title: 'Todo',
  }),
  lazy: async () => ({ Component: (await import('./pages/TodoPage')).TodoPage }),
}]
