import type { RouteObject } from 'react-router-dom'
import { appShellRoute } from '@/shared/components/layout/app-shell-route'

export const pomodoroRoutes: RouteObject[] = [{
  path: 'pomodoro',
  handle: appShellRoute({
    title: 'Pomodoro',
    description: 'Focus with a server-synchronized timer.',
  }),
  lazy: async () => ({ Component: (await import('./pages/PomodoroPage')).PomodoroPage }),
}]
