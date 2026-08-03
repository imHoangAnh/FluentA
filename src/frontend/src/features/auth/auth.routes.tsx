import type { ComponentType } from 'react'
import type { RouteObject } from 'react-router-dom'

function lazyAuthPage<T extends Record<string, unknown>>(
  load: () => Promise<T>,
  name: keyof T,
) {
  return async () => ({ Component: (await load())[name] as ComponentType })
}

export const authRoutes: RouteObject[] = [
  { path: '/login', lazy: lazyAuthPage(() => import('./pages/LoginPage'), 'LoginPage') },
  { path: '/register', lazy: lazyAuthPage(() => import('./pages/RegisterPage'), 'RegisterPage') },
  { path: '/verify-email', lazy: lazyAuthPage(() => import('./pages/VerifyEmailPage'), 'VerifyEmailPage') },
  { path: '/forgot-password', lazy: lazyAuthPage(() => import('./pages/ForgotPasswordPage'), 'ForgotPasswordPage') },
  { path: '/reset-password', lazy: lazyAuthPage(() => import('./pages/ResetPasswordPage'), 'ResetPasswordPage') },
]
