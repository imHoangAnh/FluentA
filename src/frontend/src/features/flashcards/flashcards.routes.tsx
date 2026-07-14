import type { ComponentType } from 'react'
import type { RouteObject } from 'react-router-dom'

export const flashcardRoutes: RouteObject[] = [
  { path: 'flashcards', lazy: async () => ({ Component: (await import('./pages/FlashcardsPage')).FlashcardsPage as ComponentType }) },
  { path: 'flashcards/pages/:pageId', lazy: async () => ({ Component: (await import('./pages/FlashcardViewerPage')).FlashcardViewerPage as ComponentType }) },
]
