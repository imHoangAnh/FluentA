import { describe, expect, it } from 'vitest'
import { legacyProtectedRoutes } from '@/app/legacy-routes'

describe('temporary legacy route manifest', () => {
  it('contains only the approved unmigrated E30 routes', () => {
    const paths = legacyProtectedRoutes.map((route) => route.index ? '<index>' : route.path)
    expect(paths).toEqual([
      'vocabulary',
      'todo',
      'countdowns',
      'flashcards',
      'practice',
      'habits',
      'habits/:habitId/stats',
      'journal',
      'notes',
      'kanban',
      'pomodoro',
      'notifications',
      'flashcards/pages/:pageId',
      'review',
      'practice/:pageId',
      'settings',
    ])

    const settings = legacyProtectedRoutes.find((route) => route.path === 'settings')
    expect(settings?.children?.map((route) => route.index ? '<index>' : route.path)).toEqual([
      '<index>',
      'profile',
      'practice',
      'review',
      'level5',
    ])
  })
})
