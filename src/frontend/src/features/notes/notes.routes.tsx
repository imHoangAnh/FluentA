import type { RouteObject } from 'react-router-dom'
import { appShellRoute } from '@/shared/components/layout/app-shell-route'

export const notesRoutes: RouteObject[] = [{
  path: 'notes',
  handle: appShellRoute({
    title: 'Notes',
    description: 'Organize boards, pages, and rich-text drafts in one workspace.',
    contentClassName: 'h-screen max-w-none overflow-hidden p-3 lg:p-4',
  }),
  lazy: async () => ({ Component: (await import('./pages/NotesPage')).NotesPage }),
}]
