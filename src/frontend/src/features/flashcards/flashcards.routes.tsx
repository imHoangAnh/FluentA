import type { ComponentType } from 'react'
import type { RouteObject } from 'react-router-dom'
import { appShellRoute } from '@/shared/components/layout/app-shell-route'

export const flashcardRoutes: RouteObject[] = [
  {
    path: 'flashcards',
    handle: appShellRoute({ title: 'Flashcards' }),
    lazy: async () => ({ Component: (await import('./pages/FlashcardsPage')).FlashcardsPage as ComponentType }),
  },
  {
    path: 'flashcards/pages/:pageId',
    handle: appShellRoute({
      title: 'Flashcard viewer',
      description: 'Flip cards and move at your pace.',
    }),
    lazy: async () => ({ Component: (await import('./pages/FlashcardViewerPage')).FlashcardViewerPage as ComponentType }),
  },
]
