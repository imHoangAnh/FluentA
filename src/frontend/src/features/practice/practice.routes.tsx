import type { RouteObject } from 'react-router-dom'
import { appShellRoute } from '@/shared/components/layout/app-shell-route'

export const practiceRoutes: RouteObject[] = [
  {
    path: 'practice',
    handle: appShellRoute({ title: 'Practice', contentClassName: 'practice-library-main' }),
    lazy: async () => ({ Component: (await import('./pages/PracticeLibraryPage')).PracticeLibraryPage }),
  },
  {
    path: 'practice/:sessionId',
    handle: appShellRoute({
      title: 'Practice',
      contentClassName: 'learning-figma-main',
      description: 'Practice a deck in the fixed dictation, meaning, pronunciation, and recap sequence.',
    }),
    lazy: async () => ({ Component: (await import('./pages/PracticeSessionPage')).PracticeSessionPage }),
  },
]
