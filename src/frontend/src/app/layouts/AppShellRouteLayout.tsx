import { Outlet, useMatches } from 'react-router-dom'
import { AppShell } from '@/shared/components/layout/AppShell'
import { readAppShellRoute } from '@/shared/components/layout/app-shell-route'

export function AppShellRouteLayout() {
  const shellOptions = useMatches()
    .toReversed()
    .map((match) => readAppShellRoute(match.handle))
    .find((options) => options !== null)

  if (!shellOptions) {
    throw new Error('Protected routes must define AppShell route metadata.')
  }

  return (
    <AppShell {...shellOptions}>
      <Outlet />
    </AppShell>
  )
}
