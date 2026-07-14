import type { RouteObject } from 'react-router-dom'

export const practiceRoutes: RouteObject[] = [
  {
    path: 'practice',
    lazy: async () => ({ Component: (await import('./pages/PracticeLibraryPage')).PracticeLibraryPage }),
  },
  {
    path: 'practice/:pageId',
    lazy: async () => ({ Component: (await import('./pages/PracticeSessionPage')).PracticeSessionPage }),
  },
]
