import type { RouteObject } from 'react-router-dom'

export const notesRoutes: RouteObject[] = [{ path: 'notes', lazy: async () => ({ Component: (await import('./pages/NotesPage')).NotesPage }) }]
