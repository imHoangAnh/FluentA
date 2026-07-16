import type { RouteObject } from 'react-router-dom'
import { appShellRoute } from '@/shared/components/layout/app-shell-route'

export const practiceRoutes: RouteObject[] = [
  {
    path: 'practice',
    handle: appShellRoute({ title: 'Practice' }),
    lazy: async () => ({ Component: (await import('./pages/PracticeLibraryPage')).PracticeLibraryPage }),
  },
  {
    path: 'practice/:pageId',
    handle: appShellRoute({
      title: 'Practice',
      description: 'Work through a page deck using your configured learning modes.',
    }),
    lazy: async () => ({ Component: (await import('./pages/PracticeSessionPage')).PracticeSessionPage }),
  },
]
