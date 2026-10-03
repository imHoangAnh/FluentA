import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReviewSession, ReviewSessionItem } from '@/features/review/api/review.api'
import { ReviewSessionPage } from '@/features/review/pages/ReviewSessionPage'

const reviewApiMocks = vi.hoisted(() => ({
  getReviewSession: vi.fn(),
  submitReviewAnswer: vi.fn(),
  submitReviewPronunciation: vi.fn(),
}))

vi.mock('@/features/review/api/review.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/review/api/review.api')>()
  return { ...actual, ...reviewApiMocks }
})

const answerA: ReviewSessionItem = {
  itemId: 'item-a', wordId: 'word-a', position: 0, mode: 'dictation', language: 'en',
  word: 'alpha', meaning: 'meaning A', ipaPronunciation: null, type: 'noun', context: null,
  example: 'Example A', synonyms: null, antonyms: null, isReviewed: false, result: null,
  levelBefore: null, levelAfter: null, nextReviewDateBefore: null, nextReviewDateAfter: null,
  pronunciationAttemptCount: 0,
}

const trashedB: ReviewSessionItem = {
  ...answerA, itemId: 'item-b', wordId: 'word-b', position: 1, mode: 'meaningToWord',
  word: 'bravo', meaning: 'meaning B', example: 'Example B',
}

const availableC: ReviewSessionItem = {
  ...answerA, itemId: 'item-c', wordId: 'word-c', position: 2, mode: 'meaningToWord',
  word: 'charlie', meaning: 'meaning C', example: 'Example C',
}

function createSession(items: ReviewSessionItem[], currentItemIndex: number | null, completedWords: number): ReviewSession {
  return {
    sessionId: 'session-1', localDate: '2026-10-01', startedAt: '2026-10-01T10:00:00Z',
    completedAt: null, status: 'active', totalWords: items.length, completedWords,
    currentItemIndex, items,
  }
}

describe('ReviewSessionPage queue refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses the filtered session list before advancing after an answer', async () => {
    const user = userEvent.setup()
    const initialSession = createSession([answerA, trashedB, availableC], 0, 0)
    const refreshedSession = createSession([
      { ...answerA, isReviewed: true, result: 'correct' },
      availableC,
    ], 1, 1)
    reviewApiMocks.getReviewSession
      .mockResolvedValueOnce(initialSession)
      .mockResolvedValueOnce(refreshedSession)
    reviewApiMocks.submitReviewAnswer.mockResolvedValue({
      itemId: answerA.itemId, wordId: answerA.wordId, correct: true, isReviewed: true,
      attemptsUsed: 1, attemptsRemaining: 0, result: 'correct', levelBefore: 1, levelAfter: 2,
      nextReviewDateBefore: '2026-10-01', nextReviewDateAfter: '2026-10-05', completedWords: 1,
      currentItemIndex: 1, sessionStatus: 'active', assessment: null,
    })

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/review/sessions/session-1']}>
          <Routes>
            <Route path="/review/sessions/:sessionId" element={<ReviewSessionPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    const answerInput = await screen.findByRole('textbox', { name: 'Type the word you hear' })
    await user.type(answerInput, 'alpha')
    const checkAnswerButtons = screen.getAllByRole('button', { name: 'Check answer' })
    await user.click(checkAnswerButtons[0])

    expect(await screen.findByRole('status')).toHaveTextContent('Correct')
    await waitFor(() => expect(reviewApiMocks.getReviewSession).toHaveBeenCalledTimes(2))
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByText('meaning C')).toBeInTheDocument()
    expect(screen.queryByText('meaning B')).not.toBeInTheDocument()
  })
})
