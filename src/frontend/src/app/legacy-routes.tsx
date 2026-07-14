import type { ComponentType } from 'react'
import { type RouteObject } from 'react-router-dom'

function lazyLegacyPage<T extends Record<string, unknown>>(
  load: () => Promise<T>,
  name: keyof T,
) {
  return async () => ({ Component: (await load())[name] as ComponentType })
}

export const legacyProtectedRoutes: RouteObject[] = [
  { path: 'habits', lazy: lazyLegacyPage(() => import('@/routes/habits/HabitPage'), 'HabitPage') },
  { path: 'habits/:habitId/stats', lazy: lazyLegacyPage(() => import('@/routes/habits/HabitStatsPage'), 'HabitStatsPage') },
]
