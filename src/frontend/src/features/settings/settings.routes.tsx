import type { ComponentType } from 'react'
import { Navigate, type RouteObject } from 'react-router-dom'
import { appShellRoute } from '@/shared/components/layout/app-shell-route'

function lazySettingsPage<T extends Record<string, unknown>>(load: () => Promise<T>, name: keyof T) {
  return async () => ({ Component: (await load())[name] as ComponentType })
}

export const settingsRoutes: RouteObject[] = [
  {
    path: 'settings',
    handle: appShellRoute({
      title: 'Settings',
      description: 'Manage your account profile.',
    }),
    lazy: lazySettingsPage(() => import('./pages/SettingsPage'), 'SettingsPage'),
  },
  {
    path: 'profile',
    element: <Navigate to="/settings" replace />,
  },
  { path: 'settings/practice', element: <Navigate to="/settings" replace /> },
  { path: 'settings/level5', element: <Navigate to="/review?review=open" replace /> },
  { path: 'settings/review', element: <Navigate to="/review?review=open" replace /> },
]
