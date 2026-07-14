import type { RouteObject } from 'react-router-dom'

export const todoRoutes: RouteObject[] = [{ path: 'todo', lazy: async () => ({ Component: (await import('./pages/TodoPage')).TodoPage }) }]
