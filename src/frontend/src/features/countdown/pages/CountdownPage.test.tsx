import { QueryClient } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders } from '@/app/providers'
import { CountdownPage } from './CountdownPage'

const countdownApi = vi.hoisted(() => ({
  createCountdown: vi.fn(),
  deleteCountdown: vi.fn(),
  listCountdowns: vi.fn(),
}))

vi.mock('../api/countdown.api', async (importOriginal) => ({
  ...await importOriginal<typeof import('../api/countdown.api')>(),
  ...countdownApi,
}))

vi.mock('@/features/assets', () => ({
  uploadAsset: vi.fn(),
}))

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(<AppProviders queryClient={queryClient}><CountdownPage /></AppProviders>)
}

describe('CountdownPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    countdownApi.listCountdowns.mockResolvedValue([{
      id: 'countdown-1',
      name: 'IELTS Exam',
      targetDate: '2026-08-21',
      coverAssetId: null,
      coverDownloadUrl: null,
      coverDownloadUrlExpiresAt: null,
      repeatPattern: 'None',
      isCompleted: false,
      alerts: [{ id: 'alert-1', alertDay: '1DayBefore', alertTime: '09:00', scheduledAtUtc: '2026-08-20T02:00:00Z', firedAtUtc: null }],
      createdAt: '2026-07-21T00:00:00Z',
      updatedAt: '2026-07-21T00:00:00Z',
    }])
    countdownApi.deleteCountdown.mockResolvedValue({
      id: 'trash-1', entityKind: 'Countdown', entityId: 'countdown-1', displayName: 'IELTS Exam', originalLocation: 'Countdown', trashedAt: '2026-07-28T00:00:00Z', purgeAfterAt: '2026-08-27T00:00:00Z',
    })
  })

  it('renders the compact create action and moves the exact card to Trash without confirmation', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Countdown' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New Countdown' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'IELTS Exam' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Open actions for IELTS Exam' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }))
    await waitFor(() => expect(countdownApi.deleteCountdown.mock.calls[0]?.[0]).toBe('countdown-1'))
  })

  it('renders the empty state CTA and opens the existing create dialog', async () => {
    const user = userEvent.setup()
    countdownApi.listCountdowns.mockResolvedValue([])
    renderPage()

    expect(await screen.findByRole('heading', { name: 'No Countdowns Yet' })).toBeInTheDocument()
    const createButton = screen.getByRole('button', { name: 'Create First Countdown' })
    expect(createButton).toBeInTheDocument()

    await user.click(createButton)
    expect(screen.getByRole('dialog', { name: 'Create Countdown' })).toBeInTheDocument()
  })

  it('keeps completed memories in the closed Complete board', async () => {
    countdownApi.listCountdowns.mockResolvedValue([{
      id: 'countdown-completed',
      name: 'Old memory',
      targetDate: '2026-01-10',
      coverAssetId: null,
      coverDownloadUrl: null,
      coverDownloadUrlExpiresAt: null,
      repeatPattern: 'None',
      isCompleted: true,
      alerts: [],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-10T00:00:00Z',
    }])
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Countdown' })).toBeInTheDocument()
    expect(screen.queryByText('Complete at Jan 10, 2026')).not.toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: 'Complete board, 1 countdown' }))
    expect(await screen.findByText('Complete at Jan 10, 2026')).toBeInTheDocument()
  })
})
