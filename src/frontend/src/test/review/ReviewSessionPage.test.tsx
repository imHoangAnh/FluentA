import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReviewAnswerResult, ReviewSession, ReviewSessionItem } from '@/features/review/api/review.api'
import { startPcmRecording, type PronunciationAssessment } from '@/features/pronunciation'
import { ReviewSessionPage } from '@/features/review/pages/ReviewSessionPage'

const reviewApiMocks = vi.hoisted(() => ({
  getReviewSession: vi.fn(),
  submitReviewAnswer: vi.fn(),
  submitReviewPronunciation: vi.fn(),
}))

const audio = vi.hoisted(() => ({ callback: null as ((blob: Blob) => Promise<void>) | null, cancel: vi.fn(), stop: vi.fn() }))
vi.mock('@/features/pronunciation', async importOriginal => ({
  ...await importOriginal<typeof import('@/features/pronunciation')>(),
  supportsPcmRecording: () => true,
  startPcmRecording: vi.fn(async (callback: typeof audio.callback) => { audio.callback = callback; return { cancel: audio.cancel, stop: audio.stop } }),
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

describe('Review pronunciation retries', () => {
  const pronunciationItem: ReviewSessionItem = { ...answerA, mode: 'listenAndRepeat' }
  const assessment: PronunciationAssessment = { correct: false, accuracyScore: 55, feedbackMode: 'word',
    words: [{ text: 'alpha', accuracyScore: 55, units: [] }] }
  function renderPronunciation() {
    reviewApiMocks.getReviewSession.mockResolvedValue(createSession([pronunciationItem], 0, 0))
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/review/sessions/session-1']}><Routes>
      <Route path="/review/sessions/:sessionId" element={<ReviewSessionPage />} />
    </Routes></MemoryRouter></QueryClientProvider>)
  }
  function result(correct: boolean, attemptsUsed: number): ReviewAnswerResult {
    const isReviewed = correct || attemptsUsed === 2
    return { itemId: pronunciationItem.itemId, wordId: pronunciationItem.wordId, correct, isReviewed,
      attemptsUsed, attemptsRemaining: isReviewed ? 0 : 1, result: isReviewed ? (correct ? 'correct' : 'wrong') : null,
      levelBefore: 1, levelAfter: isReviewed ? (correct ? 2 : 0) : null,
      nextReviewDateBefore: null, nextReviewDateAfter: null, completedWords: isReviewed ? 1 : 0,
      currentItemIndex: isReviewed ? null : 0, sessionStatus: isReviewed ? 'completed' : 'active',
      assessment: { ...assessment, correct, words: [{ text: 'alpha', accuracyScore: correct ? 95 : 55, units: [] }] } }
  }
  function saveResult(correct: boolean, attemptsUsed: number) {
    const response = result(correct, attemptsUsed)
    reviewApiMocks.getReviewSession.mockResolvedValue({ ...createSession([
      { ...pronunciationItem, pronunciationAttemptCount: attemptsUsed, isReviewed: response.isReviewed, result: response.result },
    ], response.currentItemIndex, response.completedWords), status: response.sessionStatus })
    return response
  }
  async function record() {
    fireEvent.click(await screen.findByRole('button', { name: 'Start recording' }))
    await screen.findByRole('button', { name: 'Stop recording' })
    await act(async () => { await audio.callback!(new Blob(['audio'])) })
  }
  beforeEach(() => {
    for (const mock of Object.values(reviewApiMocks)) mock.mockReset()
    vi.mocked(startPcmRecording).mockClear()
    audio.callback = null
  })
  for (const correct of [false, true]) it(`shows feedback, immediately records one retry, then only Continue (${correct})`, async () => {
    renderPronunciation()
    reviewApiMocks.submitReviewPronunciation
      .mockImplementationOnce(async () => saveResult(false, 1))
      .mockImplementationOnce(async () => saveResult(correct, 2))
    await record()
    expect(await screen.findByRole('button', { name: 'Red syllable alpha' })).toBeInTheDocument()
    expect(screen.getByText('Attempt 1 of 2')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Continue' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await screen.findByRole('button', { name: 'Stop recording' })
    expect(screen.queryByTestId('pronunciation-feedback')).not.toBeInTheDocument()
    expect(screen.getByText('Attempt 2 of 2')).toBeInTheDocument()
    expect(startPcmRecording).toHaveBeenCalledTimes(2)
    await act(async () => { await audio.callback!(new Blob(['audio'])) })
    expect(await screen.findByRole('button', { name: `${correct ? 'Green' : 'Red'} syllable alpha` })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
    fireEvent.keyDown(document.body, { key: 'r' })
    expect(startPcmRecording).toHaveBeenCalledTimes(2)
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(await screen.findByRole('heading', { name: 'Review complete' })).toBeInTheDocument()
    expect(reviewApiMocks.submitReviewPronunciation).toHaveBeenCalledTimes(2)
  })
  it('offers only Continue when the first pronunciation is correct', async () => {
    renderPronunciation()
    reviewApiMocks.submitReviewPronunciation.mockImplementationOnce(async () => saveResult(true, 1))
    await record()
    expect(await screen.findByRole('button', { name: 'Continue' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Green syllable alpha' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
    expect(startPcmRecording).toHaveBeenCalledTimes(1)
  })
  it('uses Enter on retry feedback to record rather than advance', async () => {
    renderPronunciation()
    reviewApiMocks.submitReviewPronunciation.mockImplementationOnce(async () => saveResult(false, 1))
    await record()
    await screen.findByRole('button', { name: 'Try again' })
    fireEvent.keyDown(document.body, { key: 'Enter' })
    await screen.findByRole('button', { name: 'Stop recording' })
    expect(screen.queryByTestId('pronunciation-feedback')).not.toBeInTheDocument()
    expect(startPcmRecording).toHaveBeenCalledTimes(2)
    expect(reviewApiMocks.submitReviewPronunciation).toHaveBeenCalledTimes(1)
  })
  it('opens only one recorder while microphone permission is pending', async () => {
    let resolveRecording!: (value: Awaited<ReturnType<typeof startPcmRecording>>) => void
    vi.mocked(startPcmRecording).mockImplementationOnce(() => new Promise(resolve => { resolveRecording = resolve }))
    renderPronunciation()
    fireEvent.click(await screen.findByRole('button', { name: 'Start recording' }))
    fireEvent.keyDown(document.body, { key: 'r' })
    expect(startPcmRecording).toHaveBeenCalledTimes(1)
    await act(async () => { resolveRecording({ cancel: audio.cancel, stop: audio.stop }) })
    expect(await screen.findByRole('button', { name: 'Stop recording' })).toBeInTheDocument()
  })
  it('keeps the remaining attempt when retry cannot access the microphone', async () => {
    renderPronunciation()
    reviewApiMocks.submitReviewPronunciation.mockImplementationOnce(async () => saveResult(false, 1))
    await record()
    vi.mocked(startPcmRecording).mockRejectedValueOnce(new Error('permission denied'))
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }))
    expect(await screen.findByText(/Microphone access is unavailable/)).toBeInTheDocument()
    expect(screen.queryByTestId('pronunciation-feedback')).not.toBeInTheDocument()
    expect(screen.getByText('Attempt 2 of 2')).toBeInTheDocument()
    expect(reviewApiMocks.submitReviewPronunciation).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Start recording' }))
    expect(await screen.findByRole('button', { name: 'Stop recording' })).toBeInTheDocument()
    expect(startPcmRecording).toHaveBeenCalledTimes(3)
  })
})

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
