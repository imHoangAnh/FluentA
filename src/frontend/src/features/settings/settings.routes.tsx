import type { ComponentType } from 'react'
import { Navigate, type RouteObject } from 'react-router-dom'
import { appShellRoute } from '@/shared/components/layout/app-shell-route'
import { SettingsLayout } from './pages/SettingsLayout'

function lazySettingsPage<T extends Record<string, unknown>>(load: () => Promise<T>, name: keyof T) {
  return async () => ({ Component: (await load())[name] as ComponentType })
}

export const settingsRoutes: RouteObject[] = [{
  path: 'settings',
  handle: appShellRoute({
    title: 'Settings',
    description: 'Manage your profile and learning preferences.',
  }),
  Component: SettingsLayout,
  children: [
    { index: true, element: <Navigate to="profile" replace /> },
    { path: 'profile', lazy: lazySettingsPage(() => import('./pages/SettingsPage'), 'SettingsPage') },
    { path: 'practice', lazy: lazySettingsPage(() => import('./pages/SettingsPracticePage'), 'SettingsPracticePage') },
    { path: 'review', lazy: lazySettingsPage(() => import('./pages/SettingsReviewPage'), 'SettingsReviewPage') },
    { path: 'level5', lazy: lazySettingsPage(() => import('./pages/LevelFiveSettingsPage'), 'LevelFiveSettingsPage') },
  ],
}]
