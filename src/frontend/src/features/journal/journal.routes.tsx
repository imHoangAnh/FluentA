import type { RouteObject } from 'react-router-dom'

export const journalRoutes: RouteObject[] = [{ path: 'journal', lazy: async () => ({ Component: (await import('./pages/JournalPage')).JournalPage }) }]
