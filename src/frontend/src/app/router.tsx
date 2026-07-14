import { createBrowserRouter, createMemoryRouter, Navigate, type RouteObject } from 'react-router-dom'
import { authRoutes } from '@/features/auth'
import { dashboardRoutes } from '@/features/dashboard'
import { notificationsRoutes } from '@/features/notifications'
import { settingsRoutes } from '@/features/settings'
import { vocabularyRoutes } from '@/features/vocabulary'
import { RouteError, RouteLoading } from '@/shared/components/feedback/RouteFeedback'
import { legacyProtectedRoutes } from './legacy-routes'
import { ProtectedRoute } from './route-guards/ProtectedRoute'
import { ProtectedRuntime } from './runtime/ProtectedRuntime'

const publicRoutes = authRoutes.map((route) => ({
  ...route,
  errorElement: <RouteError />,
  HydrateFallback: RouteLoading,
}))

export const appRoutes: RouteObject[] = [
  ...publicRoutes,
  {
    element: <ProtectedRoute />,
    errorElement: <RouteError />,
    HydrateFallback: RouteLoading,
    children: [{ element: <ProtectedRuntime />, children: [...dashboardRoutes, ...settingsRoutes, ...notificationsRoutes, ...vocabularyRoutes, ...legacyProtectedRoutes] }],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]

export function createAppRouter(initialEntries?: string[]) {
  return initialEntries
    ? createMemoryRouter(appRoutes, { initialEntries })
    : createBrowserRouter(appRoutes)
}

export const router = createAppRouter()
