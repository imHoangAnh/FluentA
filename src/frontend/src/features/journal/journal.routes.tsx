import type { RouteObject } from 'react-router-dom'
import { appShellRoute } from '@/shared/components/layout/app-shell-route'

export const journalRoutes: RouteObject[] = [{
  path: 'journal',
  handle: appShellRoute({
    title: 'Journal',
    contentClassName: 'h-screen max-w-none overflow-hidden p-3 lg:p-4',
  }),
  lazy: async () => ({ Component: (await import('./pages/JournalPage')).JournalPage }),
}]
