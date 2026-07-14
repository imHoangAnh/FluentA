import type { RouteObject } from 'react-router-dom'
export const countdownRoutes: RouteObject[] = [{ path: 'countdowns', lazy: async () => ({ Component: (await import('./pages/CountdownPage')).CountdownPage }) }]
