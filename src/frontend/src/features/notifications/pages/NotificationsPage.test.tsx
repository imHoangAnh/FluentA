import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NotificationsPage } from './NotificationsPage'

const api = vi.hoisted(() => ({
  list: vi.fn(),
  unreadCount: vi.fn(),
  markRead: vi.fn(),
  markAllRead: vi.fn(),
}))

vi.mock('../api/notification.api', async (importOriginal) => ({
  ...await importOriginal<typeof import('../api/notification.api')>(),
  notificationApi: api,
}))

function LocationProbe() {
  const location = useLocation()
  return <output aria-label="Current location">{location.pathname}{location.search}</output>
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <MemoryRouter initialEntries={['/notifications']}>
      <QueryClientProvider client={queryClient}>
        <NotificationsPage />
        <LocationProbe />
      </QueryClientProvider>
    </MemoryRouter>,
  )
}

describe('NotificationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.list.mockResolvedValue([{
      id: 'notification-1',
      type: 'TodoReminder',
      title: 'Todo reminder',
      message: 'Review vocabulary',
      actionPath: '/todo?taskId=todo-1',
      readAt: null,
      createdAt: '2026-07-22T01:00:00Z',
    }])
    api.markRead.mockResolvedValue(undefined)
    api.markAllRead.mockResolvedValue(undefined)
  })

  it('marks an unread notification and navigates to its safe action path', async () => {
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: /Todo reminder/ }))

    await waitFor(() => expect(api.markRead).toHaveBeenCalled())
    expect(api.markRead.mock.calls[0]?.[0]).toBe('notification-1')
    expect(await screen.findByLabelText('Current location')).toHaveTextContent('/todo?taskId=todo-1')
  })

  it('does not navigate to an unsafe stored action path', async () => {
    api.list.mockResolvedValueOnce([{
      id: 'notification-2',
      type: 'TodoReminder',
      title: 'Unsafe reminder',
      message: 'Do not leave the app',
      actionPath: '//example.com/todo',
      readAt: '2026-07-22T01:30:00Z',
      createdAt: '2026-07-22T01:00:00Z',
    }])
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: /Unsafe reminder/ }))

    expect(screen.getByLabelText('Current location')).toHaveTextContent('/notifications')
    expect(api.markRead).not.toHaveBeenCalled()
  })
})
