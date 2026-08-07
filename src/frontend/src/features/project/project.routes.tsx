import type { RouteObject } from 'react-router-dom'
import { appShellRoute } from '@/shared/components/layout/app-shell-route'

export const projectRoutes: RouteObject[] = [{
  path: 'project',
  handle: appShellRoute({
    title: 'Project',
    description: 'Organize work across boards and columns.',
    contentClassName: 'h-screen max-w-none overflow-hidden p-3 lg:p-4',
  }),
  lazy: async () => ({ Component: (await import('./pages/ProjectPage')).ProjectPage }),
}]
