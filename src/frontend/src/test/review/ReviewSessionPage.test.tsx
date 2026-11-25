import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReviewAnswerResult, ReviewSession, ReviewSessionItem } from '@/features/review/api/review.api'
import { ReviewSetup } from '@/features/review/components/session/ReviewSetup'
import { ReviewSessionPage } from '@/features/review/pages/ReviewSessionPage'

const reviewApiMocks = vi.hoisted(() => ({
  getReviewDashboard: vi.fn(),
  createReviewSession: vi.fn(),
  getReviewSession: vi.fn(),
  submitReviewAnswer: vi.fn(),
}))

vi.mock('@/features/review/api/review.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/review/api/review.api')>()
  return { ...actual, ...reviewApiMocks }
})

const itemA: ReviewSessionItem = {
  itemId: 'item-a',
  wordId: 'word-a',
  position: 0,
  mode: 'meaningToWord',
  language: 'en',
  word: 'mitigate',
  meaning: 'Làm dịu bớt, giảm nhẹ mức độ nghiêm trọng',
  ipaPronunciation: '/ˈmɪtɪɡeɪt/',
  type: 'verb',
  context: 'To make something harmful, unpleasant, or bad less severe or serious.',
  example: 'Steps were taken to mitigate the risk.',
  synonyms: 'alleviate',
  antonyms: 'aggravate',
  isReviewed: false,
  result: null,
  levelBefore: null,
  levelAfter: null,
  nextReviewDateBefore: null,
  nextReviewDateAfter: null,
}

const itemB: ReviewSessionItem = {
  ...itemA,
  itemId: 'item-b',
  wordId: 'word-b',
  position: 1,
  word: 'bravo',
  meaning: 'meaning B',
  context: null,
  example: 'Example B',
}

const itemC: ReviewSessionItem = {
  ...itemA,
  itemId: 'item-c',
  wordId: 'word-c',
  position: 2,
  word: 'charlie',
  meaning: 'meaning C',
  context: null,
  example: 'Example C',
}

function createSession(
  items: ReviewSessionItem[],
  currentItemIndex: number | null,
  completedWords: number,
  status: 'active' | 'completed' | 'abandoned' = 'active',
): ReviewSession {
  return {
    sessionId: 'session-1',
    localDate: '2026-11-24',
    startedAt: '2026-11-24T10:00:00Z',
    completedAt: status === 'completed' ? '2026-11-24T10:05:00Z' : null,
    status,
    totalWords: items.length,
    completedWords,
    currentItemIndex,
    items,
  }
}

function createAnswerResult(
  item: ReviewSessionItem,
  overrides: Partial<ReviewAnswerResult> = {},
): ReviewAnswerResult {
  return {
    itemId: item.itemId,
    wordId: item.wordId,
    correct: true,
    isReviewed: true,
    result: 'correct',
    levelBefore: 1,
    levelAfter: 2,
    nextReviewDateBefore: '2026-11-24',
    nextReviewDateAfter: '2026-11-28',
    completedWords: 1,
    currentItemIndex: null,
    sessionStatus: 'completed',
    ...overrides,
  }
}

function renderSessionRoute(initialEntry: string | { pathname: string; state?: { returnTo?: string } } = '/review/sessions/session-1') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/" element={<div data-testid="dashboard-route">Dashboard</div>} />
          <Route path="/vocabulary" element={<div data-testid="vocabulary-route">Vocabulary</div>} />
          <Route path="/review" element={<ReviewSessionPage />} />
          <Route path="/review/sessions/:sessionId" element={<ReviewSessionPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ReviewSessionPage (Meaning to Word)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders meaning and context, grades a correct answer, and honors filtered queue refresh', async () => {
    const user = userEvent.setup()
    const initialSession = createSession([itemA, itemB, itemC], 0, 0)
    const refreshedSession = createSession(
      [{ ...itemA, isReviewed: true, result: 'correct' }, itemC],
      1,
      1,
    )
    reviewApiMocks.getReviewSession
      .mockResolvedValueOnce(initialSession)
      .mockResolvedValueOnce(refreshedSession)
    reviewApiMocks.submitReviewAnswer.mockResolvedValue(
      createAnswerResult(itemA, {
        completedWords: 1,
        currentItemIndex: 1,
        sessionStatus: 'active',
      }),
    )

    renderSessionRoute()

    expect(await screen.findByText('Read the meaning and context, type the word.')).toBeInTheDocument()
    expect(screen.getByText('1 / 3 due today')).toBeInTheDocument()
    expect(screen.getByText('MEANING')).toBeInTheDocument()
    expect(screen.getByText(itemA.meaning!)).toBeInTheDocument()
    expect(screen.getByText('CONTEXT')).toBeInTheDocument()
    expect(screen.getByText(itemA.context!)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Check Answer' })).toBeDisabled()

    const answerInput = screen.getByRole('textbox', { name: 'Type the word' })
    await user.type(answerInput, 'mitigate')
    const checkButton = screen.getByRole('button', { name: 'Check Answer' })
    expect(checkButton).toBeEnabled()
    await user.click(checkButton)

    expect(await screen.findByRole('status')).toHaveTextContent('Correct')
    await waitFor(() => expect(reviewApiMocks.getReviewSession).toHaveBeenCalledTimes(2))

    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByText('Read the meaning, type the word.')).toBeInTheDocument()
    expect(screen.getByText('meaning C')).toBeInTheDocument()
    expect(screen.queryByText('CONTEXT')).not.toBeInTheDocument()
    expect(screen.queryByText('meaning B')).not.toBeInTheDocument()
  })

  it('supports Escape skip, shows minimal wrong feedback, and renders the session recap', async () => {
    const user = userEvent.setup()
    const initialSession = createSession([itemA, itemB], 0, 0)
    const afterFirst = createSession(
      [{ ...itemA, isReviewed: true, result: 'correct' }, itemB],
      1,
      1,
    )
    const completedSession = createSession(
      [
        { ...itemA, isReviewed: true, result: 'correct' },
        { ...itemB, isReviewed: true, result: 'wrong' },
      ],
      null,
      2,
      'completed',
    )

    reviewApiMocks.getReviewSession
      .mockResolvedValueOnce(initialSession)
      .mockResolvedValueOnce(afterFirst)
      .mockResolvedValueOnce(completedSession)

    reviewApiMocks.submitReviewAnswer
      .mockResolvedValueOnce(
        createAnswerResult(itemA, {
          correct: true,
          result: 'correct',
          completedWords: 1,
          currentItemIndex: 1,
          sessionStatus: 'active',
        }),
      )
      .mockResolvedValueOnce(
        createAnswerResult(itemB, {
          correct: false,
          result: 'wrong',
          levelAfter: 0,
          completedWords: 2,
          currentItemIndex: null,
          sessionStatus: 'completed',
        }),
      )

    renderSessionRoute({ pathname: '/review/sessions/session-1', state: { returnTo: '/vocabulary' } })

    const input = await screen.findByRole('textbox', { name: 'Type the word' })
    await user.type(input, 'mitigate{Enter}')
    expect(await screen.findByRole('status')).toHaveTextContent('Correct')

    await user.keyboard('{Enter}')
    expect(await screen.findByText('meaning B')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    await waitFor(() => expect(reviewApiMocks.submitReviewAnswer).toHaveBeenCalledTimes(2))
    expect(reviewApiMocks.submitReviewAnswer.mock.calls[1][0]).toMatchObject({
      sessionId: 'session-1',
      itemId: 'item-b',
      answerText: '',
    })

    const feedback = await screen.findByRole('status')
    expect(feedback).toHaveTextContent('Not quite')
    expect(feedback).toHaveTextContent('Correct answer: bravo')

    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByRole('heading', { name: 'Review Complete' })).toBeInTheDocument()
    expect(screen.getByText('2 / 2 completed')).toBeInTheDocument()
    expect(screen.getByText('50% Accuracy')).toBeInTheDocument()
    expect(screen.getByText('You reviewed 2 words today. Your memory schedule has been updated.')).toBeInTheDocument()

    await user.keyboard('{Enter}')
    expect(await screen.findByTestId('vocabulary-route')).toBeInTheDocument()
  })

  it('guides standalone /review visitors to the top bar menu', async () => {
    renderSessionRoute('/review')

    expect(await screen.findByRole('heading', { name: 'Review' })).toBeInTheDocument()
    expect(screen.getByText(/top bar/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open Review' })).toBeInTheDocument()
  })
})

describe('ReviewSetup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows caught-up guidance and disables start when no words are due', async () => {
    reviewApiMocks.getReviewDashboard.mockResolvedValue({ localDate: '2026-11-24', dueCount: 0 })
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/?review=open']}>
          <ReviewSetup open onOpenChange={vi.fn()} />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByTestId('review-due-count')).toHaveTextContent('0')
    expect(screen.getByText('All caught up for today!')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start review' })).toBeDisabled()
  })
})
