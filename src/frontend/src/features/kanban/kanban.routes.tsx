import type { RouteObject } from 'react-router-dom'

export const kanbanRoutes: RouteObject[] = [{ path: 'kanban', lazy: async () => ({ Component: (await import('./pages/KanbanPage')).KanbanPage }) }]
