import type { RouteObject } from 'react-router-dom'

export const reviewRoutes: RouteObject[] = [{ path: 'review', lazy: async () => ({ Component: (await import('./ReviewSessionPage')).ReviewSessionPage }) }]
