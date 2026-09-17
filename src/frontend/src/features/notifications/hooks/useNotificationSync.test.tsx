import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { notificationKeys } from '../api/notification.queries'
import { useNotificationSync } from './useNotificationSync'

const signalr = vi.hoisted(() => {
  const connection = {
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    off: vi.fn(),
    onreconnected: vi.fn(),
    onclose: vi.fn(),
  }
  const builder = {
    withUrl: vi.fn(),
    withAutomaticReconnect: vi.fn(),
    build: vi.fn(() => connection),
  }

  builder.withUrl.mockReturnValue(builder)
  builder.withAutomaticReconnect.mockReturnValue(builder)

  return { connection, builder }
})

vi.mock('@microsoft/signalr', () => ({
  HubConnectionBuilder: vi.fn(function HubConnectionBuilder() {
    return signalr.builder
  }),
}))

vi.mock('@/features/auth', () => ({
  useAuthStore: (selector: (state: { status: string }) => unknown) => selector({ status: 'authenticated' }),
}))

function SyncHarness() {
  useNotificationSync()
  return null
}

function renderSync(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <SyncHarness />
    </QueryClientProvider>,
  )
}

describe('useNotificationSync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('MODE', 'development')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.useRealTimers()
  })

  it('refreshes notification queries after initial start and reconnect', async () => {
    const queryClient = new QueryClient()
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue({} as never)
    const view = renderSync(queryClient)

    await waitFor(() => expect(signalr.connection.start).toHaveBeenCalledTimes(1))
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: notificationKeys.all, refetchType: 'all' })

    const onReconnected = signalr.connection.onreconnected.mock.calls[0]?.[0] as (() => void) | undefined
    expect(onReconnected).toEqual(expect.any(Function))
    onReconnected?.()

    await waitFor(() => expect(invalidateQueries.mock.calls.filter(([input]) => input && 'queryKey' in input && input.queryKey === notificationKeys.all)).toHaveLength(2))
    view.unmount()
  })

  it('restarts after automatic reconnect gives up', async () => {
    const queryClient = new QueryClient()
    const view = renderSync(queryClient)
    await waitFor(() => expect(signalr.connection.start).toHaveBeenCalledTimes(1))

    const onClose = signalr.connection.onclose.mock.calls[0]?.[0] as (() => void) | undefined
    expect(onClose).toEqual(expect.any(Function))

    vi.useFakeTimers()
    onClose?.()
    await vi.advanceTimersByTimeAsync(999)
    expect(signalr.connection.start).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(signalr.connection.start).toHaveBeenCalledTimes(2)
    view.unmount()
  })
})

void (undefined as ReactNode | undefined)
