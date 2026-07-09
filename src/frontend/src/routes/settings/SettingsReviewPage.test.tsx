import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as flashcardApi from '../../lib/api/flashcard.api'
import { SettingsReviewPage } from './SettingsReviewPage'

vi.mock('../../lib/api/flashcard.api', async () => {
  const actual = await vi.importActual<typeof import('../../lib/api/flashcard.api')>('../../lib/api/flashcard.api')
  return {
    ...actual,
    getReviewSettings: vi.fn(),
    updateReviewSettings: vi.fn(),
  }
})

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <SettingsReviewPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('SettingsReviewPage manual save', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(flashcardApi.getReviewSettings).mockResolvedValue({
      dailyLimit: 300,
      recapAfterAnswer: true,
    })
    vi.mocked(flashcardApi.updateReviewSettings).mockResolvedValue({
      dailyLimit: 250,
      recapAfterAnswer: false,
    })
  })

  it('keeps review edits local until save is clicked', async () => {
    const user = userEvent.setup()

    renderPage()

    expect(await screen.findByRole('heading', { name: 'Board review defaults' })).toBeInTheDocument()

    const dailyLimitInput = screen.getByLabelText('Daily limit')
    await user.clear(dailyLimitInput)
    await user.type(dailyLimitInput, '250')
    await user.click(screen.getByRole('checkbox', { name: 'Recap after each correct answer' }))

    expect(flashcardApi.updateReviewSettings).not.toHaveBeenCalled()
    expect(screen.getByText('Unsaved changes.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Save review settings' }))

    await waitFor(() => expect(flashcardApi.updateReviewSettings).toHaveBeenCalled())
    expect(vi.mocked(flashcardApi.updateReviewSettings).mock.calls[0]?.[0]).toEqual({
      dailyLimit: 250,
      recapAfterAnswer: false,
    })
    expect(await screen.findByText('Review settings saved.')).toBeInTheDocument()
  })

  it('keeps the local review draft after a save failure', async () => {
    const user = userEvent.setup()

    vi.mocked(flashcardApi.updateReviewSettings).mockRejectedValueOnce(new Error('Review save failed.'))

    renderPage()

    expect(await screen.findByRole('heading', { name: 'Board review defaults' })).toBeInTheDocument()

    const dailyLimitInput = screen.getByLabelText('Daily limit')
    await user.clear(dailyLimitInput)
    await user.type(dailyLimitInput, '250')
    await user.click(screen.getByRole('button', { name: 'Save review settings' }))

    expect(await screen.findByText('Review save failed.')).toBeInTheDocument()
    expect(screen.getByDisplayValue('250')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save review settings' })).toBeEnabled()
  })
})
