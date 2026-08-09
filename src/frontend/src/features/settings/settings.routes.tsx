import type { ComponentType } from 'react'
import { Navigate, type RouteObject } from 'react-router-dom'
import { appShellRoute } from '@/shared/components/layout/app-shell-route'
import { SettingsLayout } from './pages/SettingsLayout'

function lazySettingsPage<T extends Record<string, unknown>>(load: () => Promise<T>, name: keyof T) {
  return async () => ({ Component: (await load())[name] as ComponentType })
}

export const settingsRoutes: RouteObject[] = [
  {
    path: 'profile',
    handle: appShellRoute({
      title: 'Profile',
      description: 'Manage your account profile.',
    }),
    lazy: lazySettingsPage(() => import('./pages/SettingsPage'), 'SettingsPage'),
  },
  {
    path: 'settings',
    handle: appShellRoute({
      title: 'Settings',
      description: 'Manage your learning preferences.',
    }),
    Component: SettingsLayout,
    children: [
      { index: true, element: <Navigate to="practice" replace /> },
      { path: 'practice', lazy: lazySettingsPage(() => import('./pages/SettingsPracticePage'), 'SettingsPracticePage') },
      { path: 'level5', lazy: lazySettingsPage(() => import('./pages/LevelFiveSettingsPage'), 'LevelFiveSettingsPage') },
      { path: 'review', element: <Navigate to="/settings/practice" replace /> },
    ],
  },
]
