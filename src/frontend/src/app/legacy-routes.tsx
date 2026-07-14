import type { ComponentType } from 'react'
import { Navigate, type RouteObject } from 'react-router-dom'

function lazyLegacyPage<T extends Record<string, unknown>>(
  load: () => Promise<T>,
  name: keyof T,
) {
  return async () => ({ Component: (await load())[name] as ComponentType })
}

export const legacyProtectedRoutes: RouteObject[] = [
  { path: 'vocabulary', lazy: lazyLegacyPage(() => import('@/routes/workspace/WorkspacePage'), 'WorkspacePage') },
  { path: 'todo', lazy: lazyLegacyPage(() => import('@/routes/todo/TodoPage'), 'TodoPage') },
  { path: 'countdowns', lazy: lazyLegacyPage(() => import('@/routes/countdown/CountdownPage'), 'CountdownPage') },
  {
    path: 'flashcards',
    lazy: async () => {
      const { FlashcardsPage } = await import('@/routes/flashcards/FlashcardsPage')
      return { Component: () => <FlashcardsPage entryMode="flashcards" /> }
    },
  },
  {
    path: 'practice',
    lazy: async () => {
      const { FlashcardsPage } = await import('@/routes/flashcards/FlashcardsPage')
      return { Component: () => <FlashcardsPage entryMode="practice" /> }
    },
  },
  { path: 'habits', lazy: lazyLegacyPage(() => import('@/routes/habits/HabitPage'), 'HabitPage') },
  { path: 'habits/:habitId/stats', lazy: lazyLegacyPage(() => import('@/routes/habits/HabitStatsPage'), 'HabitStatsPage') },
  { path: 'journal', lazy: lazyLegacyPage(() => import('@/routes/journal/JournalPage'), 'JournalPage') },
  { path: 'notes', lazy: lazyLegacyPage(() => import('@/routes/notes/NotesPage'), 'NotesPage') },
  { path: 'kanban', lazy: lazyLegacyPage(() => import('@/routes/kanban/KanbanPage'), 'KanbanPage') },
  { path: 'pomodoro', lazy: lazyLegacyPage(() => import('@/routes/pomodoro/PomodoroPage'), 'PomodoroPage') },
  { path: 'notifications', lazy: lazyLegacyPage(() => import('@/routes/notifications/NotificationsPage'), 'NotificationsPage') },
  { path: 'flashcards/pages/:pageId', lazy: lazyLegacyPage(() => import('@/routes/flashcards/FlashcardViewerPage'), 'FlashcardViewerPage') },
  { path: 'review', lazy: lazyLegacyPage(() => import('@/routes/flashcards/ReviewSessionPage'), 'ReviewSessionPage') },
  { path: 'practice/:pageId', lazy: lazyLegacyPage(() => import('@/routes/flashcards/PracticeSessionPage'), 'PracticeSessionPage') },
  {
    path: 'settings',
    lazy: lazyLegacyPage(() => import('@/routes/settings/SettingsLayout'), 'SettingsLayout'),
    children: [
      { index: true, element: <Navigate to="profile" replace /> },
      { path: 'profile', lazy: lazyLegacyPage(() => import('@/routes/settings/SettingsPage'), 'SettingsPage') },
      { path: 'practice', lazy: lazyLegacyPage(() => import('@/routes/settings/SettingsPracticePage'), 'SettingsPracticePage') },
      { path: 'review', lazy: lazyLegacyPage(() => import('@/routes/settings/SettingsReviewPage'), 'SettingsReviewPage') },
      { path: 'level5', lazy: lazyLegacyPage(() => import('@/routes/settings/LevelFiveSettingsPage'), 'LevelFiveSettingsPage') },
    ],
  },
]
