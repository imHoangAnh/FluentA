import type { ComponentType } from 'react'
import { type RouteObject } from 'react-router-dom'

function lazyLegacyPage<T extends Record<string, unknown>>(
  load: () => Promise<T>,
  name: keyof T,
) {
  return async () => ({ Component: (await load())[name] as ComponentType })
}

export const legacyProtectedRoutes: RouteObject[] = [
  { path: 'todo', lazy: lazyLegacyPage(() => import('@/routes/todo/TodoPage'), 'TodoPage') },
  { path: 'countdowns', lazy: lazyLegacyPage(() => import('@/routes/countdown/CountdownPage'), 'CountdownPage') },
  { path: 'habits', lazy: lazyLegacyPage(() => import('@/routes/habits/HabitPage'), 'HabitPage') },
  { path: 'habits/:habitId/stats', lazy: lazyLegacyPage(() => import('@/routes/habits/HabitStatsPage'), 'HabitStatsPage') },
  { path: 'journal', lazy: lazyLegacyPage(() => import('@/routes/journal/JournalPage'), 'JournalPage') },
  { path: 'notes', lazy: lazyLegacyPage(() => import('@/routes/notes/NotesPage'), 'NotesPage') },
  { path: 'kanban', lazy: lazyLegacyPage(() => import('@/routes/kanban/KanbanPage'), 'KanbanPage') },
  { path: 'pomodoro', lazy: lazyLegacyPage(() => import('@/routes/pomodoro/PomodoroPage'), 'PomodoroPage') },
]
