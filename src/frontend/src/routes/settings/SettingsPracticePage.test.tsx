import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as flashcardApi from '../../lib/api/flashcard.api'
import { SettingsPracticePage } from './SettingsPracticePage'

vi.mock('../../lib/api/flashcard.api', async () => {
  const actual = await vi.importActual<typeof import('../../lib/api/flashcard.api')>('../../lib/api/flashcard.api')
  return {
    ...actual,
    getPracticeSettings: vi.fn(),
    updatePracticeSettings: vi.fn(),
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
        <SettingsPracticePage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('SettingsPracticePage manual save', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(flashcardApi.getPracticeSettings).mockResolvedValue({
      modeSequence: ['dictation', 'meaningToWord', 'pronunciation'],
    })
    vi.mocked(flashcardApi.updatePracticeSettings).mockResolvedValue({
      modeSequence: ['dictation', 'meaningToWord'],
    })
  })

  it('keeps practice edits local until save is clicked', async () => {
    const user = userEvent.setup()

    renderPage()

    expect(await screen.findByRole('heading', { name: 'Practice mode sequence' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /pronunciation/i }))

    expect(flashcardApi.updatePracticeSettings).not.toHaveBeenCalled()
    expect(screen.getByText('Unsaved changes.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Save practice settings' }))

    await waitFor(() => expect(flashcardApi.updatePracticeSettings).toHaveBeenCalled())
    expect(vi.mocked(flashcardApi.updatePracticeSettings).mock.calls[0]?.[0]).toEqual({
      modeSequence: ['dictation', 'meaningToWord'],
    })
    expect(await screen.findByText('Practice settings saved.')).toBeInTheDocument()
  })

  it('keeps the local draft visible after a save failure', async () => {
    const user = userEvent.setup()

    vi.mocked(flashcardApi.updatePracticeSettings).mockRejectedValueOnce(new Error('Practice save failed.'))

    renderPage()

    expect(await screen.findByRole('heading', { name: 'Practice mode sequence' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /pronunciation/i }))
    await user.click(screen.getByRole('button', { name: 'Save practice settings' }))

    expect(await screen.findByText('Unable to save practice settings. Your draft is still here.')).toBeInTheDocument()
    expect(screen.getByText('Click to include this mode.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save practice settings' })).toBeEnabled()
  })
})
