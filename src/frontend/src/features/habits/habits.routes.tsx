import type { RouteObject } from 'react-router-dom'
export const habitsRoutes: RouteObject[] = [
  { path: 'habits', lazy: async () => ({ Component: (await import('./pages/HabitPage')).HabitPage }) },
  { path: 'habits/:habitId/stats', lazy: async () => ({ Component: (await import('./pages/HabitStatsPage')).HabitStatsPage }) },
]
