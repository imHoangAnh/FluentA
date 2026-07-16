import type { RouteObject } from 'react-router-dom'
import { appShellRoute } from '@/shared/components/layout/app-shell-route'

export const journalRoutes: RouteObject[] = [{
  path: 'journal',
  handle: appShellRoute({
    title: 'Journal',
    description: 'Capture learning reflections and keep them organized by date.',
    contentClassName: 'max-w-none p-0',
  }),
  lazy: async () => ({ Component: (await import('./pages/JournalPage')).JournalPage }),
}]
