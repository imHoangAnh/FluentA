import { QueryClient } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { App } from '@/app/App'
import { AppProviders } from '@/app/providers'
import { createAppRouter } from '@/app/router'

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

export function renderAppRoute(
  initialEntry: string,
  queryClient = createTestQueryClient(),
) {
  const router = createAppRouter([initialEntry])
  return {
    ...render(
      <AppProviders queryClient={queryClient}>
        <App router={router} />
      </AppProviders>,
    ),
    queryClient,
    router,
  }
}

export function renderWithProviders(
  ui: ReactElement,
  queryClient = createTestQueryClient(),
) {
  return {
    ...render(<AppProviders queryClient={queryClient}>{ui}</AppProviders>),
    queryClient,
  }
}
