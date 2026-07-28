import type { RouteObject } from 'react-router-dom'
import { appShellRoute } from '@/shared/components/layout/app-shell-route'

export const trashRoutes: RouteObject[] = [{
  path: 'trash',
  handle: appShellRoute({ title: 'Trash', description: 'Restore items before they are permanently removed.' }),
  lazy: async () => ({ Component: (await import('./pages/TrashPage')).TrashPage }),
}]
