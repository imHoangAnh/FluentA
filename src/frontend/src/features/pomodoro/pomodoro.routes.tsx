import type { RouteObject } from 'react-router-dom'
export const pomodoroRoutes: RouteObject[] = [{ path: 'pomodoro', lazy: async () => ({ Component: (await import('./pages/PomodoroPage')).PomodoroPage }) }]
