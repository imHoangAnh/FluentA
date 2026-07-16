import type { RouteObject } from 'react-router-dom'
import { appShellRoute } from '@/shared/components/layout/app-shell-route'

export const habitsRoutes: RouteObject[] = [
  {
    path: 'habits',
    handle: appShellRoute({ title: 'Habits', description: 'Build consistency with small actions every day.' }),
    lazy: async () => ({ Component: (await import('./pages/HabitPage')).HabitPage }),
  },
  {
    path: 'habits/:habitId/stats',
    handle: appShellRoute({
      title: 'Habit statistics',
      description: 'Review streaks, completion rates, and schedule details.',
    }),
    lazy: async () => ({ Component: (await import('./pages/HabitStatsPage')).HabitStatsPage }),
  },
]
