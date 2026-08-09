import { createBrowserRouter, createMemoryRouter, Navigate, type RouteObject } from 'react-router-dom'
import { authRoutes } from '@/features/auth'
import { dashboardRoutes } from '@/features/dashboard'
import { notificationsRoutes } from '@/features/notifications'
import { settingsRoutes } from '@/features/settings'
import { vocabularyRoutes } from '@/features/vocabulary'
import { flashcardRoutes } from '@/features/flashcards'
import { practiceRoutes } from '@/features/practice'
import { reviewRoutes } from '@/features/review'
import { todoRoutes } from '@/features/todo'
import { projectRoutes } from '@/features/project'
import { journalRoutes } from '@/features/journal'
import { notesRoutes } from '@/features/notes'
import { pomodoroRoutes } from '@/features/pomodoro'
import { countdownRoutes } from '@/features/countdown'
import { habitsRoutes } from '@/features/habits'
import { trashRoutes } from '@/features/trash'
import { RouteError, RouteLoading } from '@/shared/components/feedback/RouteFeedback'
import { AppShellRouteLayout } from './layouts/AppShellRouteLayout'
import { ProtectedRoute } from './route-guards/ProtectedRoute'
import { ProtectedRuntime } from './runtime/ProtectedRuntime'

const publicRoutes = authRoutes.map((route) => ({
  ...route,
  errorElement: <RouteError />,
  HydrateFallback: RouteLoading,
}))

export const protectedAppRoutes: RouteObject[] = [
  ...dashboardRoutes,
  ...settingsRoutes,
  ...notificationsRoutes,
  ...vocabularyRoutes,
  ...flashcardRoutes,
  ...practiceRoutes,
  ...reviewRoutes,
  ...todoRoutes,
  ...projectRoutes,
  ...journalRoutes,
  ...notesRoutes,
  ...pomodoroRoutes,
  ...countdownRoutes,
  ...habitsRoutes,
  ...trashRoutes,
]

export const appRoutes: RouteObject[] = [
  ...publicRoutes,
  {
    element: <ProtectedRoute />,
    errorElement: <RouteError />,
    HydrateFallback: RouteLoading,
    children: [{
      element: <ProtectedRuntime />,
      children: [{ element: <AppShellRouteLayout />, children: protectedAppRoutes }],
    }],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]

export function createAppRouter(initialEntries?: string[]) {
  return initialEntries
    ? createMemoryRouter(appRoutes, { initialEntries })
    : createBrowserRouter(appRoutes)
}

export const router = createAppRouter()
