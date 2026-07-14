import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { type ReactNode, useMemo } from 'react'
import { useAuthStore } from '@/features/auth'
import { ShellEnvironmentProvider } from '@/shared/components/layout/ShellEnvironment'
import { Toaster } from '@/shared/components/ui/toaster'
import { shellNavigationSections, shellNotificationsPath, shellSettingsNavigation } from './navigation'
import { queryClient as productionQueryClient } from './query-client'

type AppProvidersProps = {
  children: ReactNode
  queryClient?: QueryClient
}

export function AppProviders({ children, queryClient = productionQueryClient }: AppProvidersProps) {
  const account = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const shellEnvironment = useMemo(() => ({
    account,
    logout,
    navigationSections: shellNavigationSections,
    settingsNavigation: shellSettingsNavigation,
    notificationsPath: shellNotificationsPath,
  }), [account, logout])

  return (
    <QueryClientProvider client={queryClient}>
      <ShellEnvironmentProvider value={shellEnvironment}>
        {children}
        <Toaster />
      </ShellEnvironmentProvider>
    </QueryClientProvider>
  )
}
