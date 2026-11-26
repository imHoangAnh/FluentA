import type { ComponentType } from 'react'
import type { RouteObject } from 'react-router-dom'
import { appShellRoute } from '@/shared/components/layout/app-shell-route'

function lazyProfilePage<T extends Record<string, unknown>>(load: () => Promise<T>, name: keyof T) {
  return async () => ({ Component: (await load())[name] as ComponentType })
}

export const profileRoutes: RouteObject[] = [
  {
    path: 'profile',
    handle: appShellRoute({
      title: 'Profile',
      description: 'Manage your account profile.',
    }),
    lazy: lazyProfilePage(() => import('./pages/ProfilePage'), 'ProfilePage'),
  },
]
