import type { ComponentType } from 'react'
import { Navigate, type RouteObject } from 'react-router-dom'
import { AuthLayout } from './components/AuthLayout'

function lazyAuthPage<T extends Record<string, unknown>>(
  load: () => Promise<T>,
  name: keyof T,
) {
  return async () => ({ Component: (await load())[name] as ComponentType })
}

export const authRoutes: RouteObject[] = [
  { path: '/login', element: <Navigate to="/" replace state={{ authMode: 'login' }} /> },
  { path: '/register', element: <Navigate to="/" replace state={{ authMode: 'register' }} /> },
  { path: '/forgot-password', element: <Navigate to="/" replace state={{ authMode: 'forgot-password' }} /> },
  { path: '/verify-email', element: <Navigate to="/" replace state={{ authMode: 'login' }} /> },
  {
    element: <AuthLayout />,
    children: [
      { path: '/reset-password', lazy: lazyAuthPage(() => import('./pages/ResetPasswordPage'), 'ResetPasswordPage') },
    ],
  },
]

