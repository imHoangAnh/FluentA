import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PracticeSessionPage } from '@/features/practice/pages/PracticeSessionPage'
import * as api from '@/features/practice/api/practice.api'
import { practiceKeys } from '@/features/practice/api/practice.queries'
import { toast } from '@/shared/lib/toast'
import { startPcmRecording, type PronunciationAssessment } from '@/features/pronunciation'

const audio = vi.hoisted(() => ({ callback: null as ((blob: Blob) => Promise<void>) | null, cancel: vi.fn(), stop: vi.fn() }))
vi.mock('@/features/practice/api/practice.api', () => ({
  getPracticeSession: vi.fn(),
  submitPracticeAnswer: vi.fn(),
  retryPracticeStep: vi.fn(),
  submitPracticePronunciationAttempt: vi.fn(),
  setPracticeReviewLevel: vi.fn(),
  completePracticeSession: vi.fn(),
}))
vi.mock('@/shared/lib/toast', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock('@/features/pronunciation', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/features/pronunciation')>(),
  supportsPcmRecording: () => true,
  startPcmRecording: vi.fn(async (callback: typeof audio.callback) => {
    audio.callback = callback
    return { cancel: audio.cancel, stop: audio.stop }
  }),
}))

const item: api.PracticeSessionItem = {
  itemId: 'item-1',
  wordId: 'word-1',
  position: 0,
  word: 'alpha',
  meaning: 'first',
  ipaPronunciation: '/a/',
  type: 'noun',
  context: null,
  example: 'Alpha example.',
  synonyms: null,
  antonyms: null,
  currentStep: 'dictation',
  alreadyInReview: false,
  answerSlots: [
    { slotId: 'correct', meaning: 'first' },
    { slotId: 'wrong', meaning: 'second' },
    { slotId: 'empty1', meaning: null },
    { slotId: 'empty2', meaning: null },
  ],
  selectedLevel: null,
  isCompleted: false,
  attemptCount: 0,
  pronunciationAttemptCount: 0,
}

const session: api.PracticeSession = {
  sessionId: 'session-1',
  pageId: 'page-1',
  pageName: 'Page',
  boardId: 'board-1',
  boardName: 'Board',
  boardLanguage: 'en',
  status: 'active',
  currentItemIndex: 0,
  items: [item, { ...item, itemId: 'item-2', wordId: 'word-2', position: 1, word: 'beta' }],
}

function at(step: api.PracticeStep): api.PracticeSession {
  return { ...session, items: [{ ...item, currentStep: step }, session.items[1]] }
}

function renderSession(initial = session) {
  vi.mocked(api.getPracticeSession).mockResolvedValue(initial)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/practice/session-1']}>
        <Routes>
          <Route path="/practice/:sessionId" element={<PracticeSessionPage />} />
          <Route path="/practice" element={<p>Practice decks</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return client
}

async function answer() {
  const input = await screen.findByRole('textbox', { name: 'Type the word you hear' })
  fireEvent.change(input, { target: { value: 'alpha' } })
  fireEvent.keyDown(input, { key: 'Enter' })
}

describe('Practice authoritative recovery and Figma modes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    audio.callback = null
    for (const mock of [
      api.getPracticeSession,
      api.submitPracticeAnswer,
      api.retryPracticeStep,
      api.setPracticeReviewLevel,
      api.submitPracticePronunciationAttempt,
      api.completePracticeSession,
    ]) {
      vi.mocked(mock).mockReset()
    }
    vi.mocked(api.completePracticeSession).mockResolvedValue(undefined)
  })

  it('shows stepper progress for each step and exits back to decks via Exit Practice', async () => {
    renderSession(at('wordToMeaning'))

    const stepper = await screen.findByRole('navigation', { name: 'Practice steps' })
    expect(within(stepper).getByText('Dictation')).toBeInTheDocument()
    const activeStep = within(stepper).getByText(/Word to Meaning/).closest('[aria-current="step"]')
    expect(activeStep).toBeInTheDocument()
    expect(within(stepper).getByText(/Pronunciation/)).toBeInTheDocument()
    expect(screen.getByText('Word 1 of 2')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Exit Practice' }))
    expect(await screen.findByText('Practice decks')).toBeInTheDocument()
  })

  it('opens only one recorder while microphone permission is pending', async () => {
    let resolveRecording!: (value: Awaited<ReturnType<typeof startPcmRecording>>) => void
    vi.mocked(startPcmRecording).mockImplementationOnce(() => new Promise((resolve) => { resolveRecording = resolve }))
    renderSession(at('pronunciation'))
    fireEvent.click(await screen.findByRole('button', { name: 'Start recording' }))
    fireEvent.keyDown(document.body, { key: 'r' })
    expect(startPcmRecording).toHaveBeenCalledTimes(1)
    await act(async () => { resolveRecording({ cancel: audio.cancel, stop: audio.stop }) })
    expect(await screen.findByRole('button', { name: 'Stop recording and check' })).toBeInTheDocument()
  })

  it('keeps normal correctness feedback until Continue while caching server progress', async () => {
    const client = renderSession()
    vi.mocked(api.submitPracticeAnswer).mockResolvedValue({
      itemId: item.itemId,
      step: 'dictation',
      correctness: true,
      canRetry: false,
      nextStep: 'wordToMeaning',
      currentItemIndex: 0,
      status: 'active',
    })
    await answer()
    expect(await screen.findByRole('button', { name: 'Continue' })).toBeInTheDocument()
    expect(client.getQueryData<api.PracticeSession>(practiceKeys.session('session-1'))?.items[0].currentStep).toBe('wordToMeaning')
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(await screen.findByText('first')).toBeInTheDocument()
  })

  it('retries correct dictation repeatedly before Continue with fresh answer ids', async () => {
    renderSession()
    vi.mocked(api.submitPracticeAnswer).mockResolvedValue({
      itemId: item.itemId,
      step: 'dictation',
      correctness: true,
      canRetry: false,
      nextStep: 'wordToMeaning',
      currentItemIndex: 0,
      status: 'active',
    })
    vi.mocked(api.retryPracticeStep).mockResolvedValue({ itemId: item.itemId, step: 'dictation' })
    for (let attempt = 0; attempt < 4; attempt++) {
      await answer()
      fireEvent.click(await screen.findByRole('button', { name: 'Try Again' }))
      await waitFor(() => expect(screen.getByRole('textbox')).toBeEnabled())
      expect(screen.getByRole('textbox')).toHaveValue('')
      expect(screen.queryByRole('button', { name: 'Continue' })).not.toBeInTheDocument()
    }
    const ids = vi.mocked(api.submitPracticeAnswer).mock.calls.map((call) => call[1].requestId)
    expect(new Set(ids).size).toBe(4)
    expect(vi.mocked(api.retryPracticeStep).mock.calls.map((call) => call[0].attemptId)).toEqual(ids)
    await answer()
    fireEvent.click(await screen.findByRole('button', { name: 'Continue' }))
    expect(await screen.findByText('first')).toBeInTheDocument()
  })

  it('reopens correct word-to-meaning and clears the selected answer', async () => {
    renderSession(at('wordToMeaning'))
    vi.mocked(api.submitPracticeAnswer).mockResolvedValue({
      itemId: item.itemId,
      step: 'wordToMeaning',
      correctness: true,
      canRetry: false,
      nextStep: 'pronunciation',
      currentItemIndex: 0,
      status: 'active',
    })
    vi.mocked(api.retryPracticeStep).mockResolvedValue({ itemId: item.itemId, step: 'wordToMeaning' })
    fireEvent.click(await screen.findByText('first'))
    fireEvent.click(await screen.findByRole('button', { name: 'Try Again' }))
    await waitFor(() => expect(screen.getByText('first').closest('button')).toBeEnabled())
    fireEvent.click(screen.getByText('first'))
    await waitFor(() => expect(api.submitPracticeAnswer).toHaveBeenCalledTimes(2))
  })

  it('checks a lost retry response and reopens without resubmitting it', async () => {
    renderSession()
    vi.mocked(api.submitPracticeAnswer).mockResolvedValue({
      itemId: item.itemId,
      step: 'dictation',
      correctness: true,
      canRetry: false,
      nextStep: 'wordToMeaning',
      currentItemIndex: 0,
      status: 'active',
    })
    vi.mocked(api.retryPracticeStep).mockImplementation(async (input) => {
      vi.mocked(api.getPracticeSession).mockResolvedValue({
        ...session,
        items: [{
          ...item,
          lastAttempt: { requestId: input.attemptId, step: 'dictation', correctness: true, isSkip: false, attemptNumber: null, assessment: null },
        }, session.items[1]],
      })
      throw new Error('response lost')
    })
    await answer()
    fireEvent.click(await screen.findByRole('button', { name: 'Try Again' }))
    await waitFor(() => expect(screen.getByRole('textbox')).toBeEnabled())
    expect(screen.getByRole('textbox')).toHaveValue('')
    expect(api.retryPracticeStep).toHaveBeenCalledTimes(1)
    expect(api.submitPracticeAnswer).toHaveBeenCalledTimes(1)
  })

  it('retains correct feedback after an unsaved retry and permits a manual retry', async () => {
    const client = renderSession()
    vi.mocked(api.submitPracticeAnswer).mockResolvedValue({
      itemId: item.itemId,
      step: 'dictation',
      correctness: true,
      canRetry: false,
      nextStep: 'wordToMeaning',
      currentItemIndex: 0,
      status: 'active',
    })
    vi.mocked(api.retryPracticeStep).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ itemId: item.itemId, step: 'dictation' })
    await answer()
    await screen.findByRole('button', { name: 'Try Again' })
    vi.mocked(api.getPracticeSession).mockResolvedValue(client.getQueryData<api.PracticeSession>(practiceKeys.session('session-1'))!)
    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }))
    expect(await screen.findByText('Unable to restart this exercise. Please try again.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }))
    await waitFor(() => expect(screen.getByRole('textbox')).toBeEnabled())
    expect(api.retryPracticeStep).toHaveBeenCalledTimes(2)
  })

  it('blocks Continue and retry while a lost retry cannot be checked', async () => {
    renderSession()
    vi.mocked(api.submitPracticeAnswer).mockResolvedValue({
      itemId: item.itemId,
      step: 'dictation',
      correctness: true,
      canRetry: false,
      nextStep: 'wordToMeaning',
      currentItemIndex: 0,
      status: 'active',
    })
    vi.mocked(api.retryPracticeStep).mockRejectedValue(new Error('lost'))
    await answer()
    vi.mocked(api.getPracticeSession).mockRejectedValueOnce(new Error('offline'))
    fireEvent.click(await screen.findByRole('button', { name: 'Try Again' }))
    const connection = await screen.findByRole('button', { name: 'Retry connection' })
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeDisabled()
    fireEvent.keyDown(document.body, { key: 'Enter' })
    expect(screen.getByRole('textbox')).toHaveValue('alpha')
    const attemptId = vi.mocked(api.retryPracticeStep).mock.calls[0][0].attemptId
    vi.mocked(api.getPracticeSession).mockResolvedValue({
      ...session,
      items: [{
        ...item,
        lastAttempt: { requestId: attemptId, step: 'dictation', correctness: true, isSkip: false, attemptNumber: null, assessment: null },
      }, session.items[1]],
    })
    fireEvent.click(connection)
    await waitFor(() => expect(screen.getByRole('textbox')).toBeEnabled())
    expect(screen.getByRole('textbox')).toHaveValue('')
    expect(api.retryPracticeStep).toHaveBeenCalledTimes(1)
  })

  it('retries correct pronunciation via the mic button and continues to Recap', async () => {
    renderSession(at('pronunciation'))
    const assessment: PronunciationAssessment = {
      correct: true,
      accuracyScore: 95,
      feedbackMode: 'word',
      words: [{ text: 'alpha', accuracyScore: 95, units: [] }],
    }
    vi.mocked(api.submitPracticePronunciationAttempt).mockImplementation(async () => ({
      itemId: item.itemId,
      assessment,
      isCorrect: true,
      attemptNumber: vi.mocked(api.submitPracticePronunciationAttempt).mock.calls.length,
      attemptsRemaining: null,
      nextStep: 'recap',
      currentItemIndex: 0,
      status: 'active',
    }))
    vi.mocked(api.retryPracticeStep).mockResolvedValue({ itemId: item.itemId, step: 'pronunciation' })

    for (let attempt = 1; attempt <= 4; attempt++) {
      if (attempt === 1) fireEvent.click(await screen.findByRole('button', { name: 'Start recording' }))
      await waitFor(() => expect(screen.getByRole('button', { name: 'Stop recording and check' })).toBeInTheDocument())
      await act(async () => { await audio.callback!(new Blob(['audio'])) })
      expect(screen.queryByText(/Saved pronunciation attempts/)).not.toBeInTheDocument()
      expect(await screen.findByRole('button', { name: 'Continue to Recap' })).toBeInTheDocument()
      if (attempt < 4) {
        fireEvent.click(screen.getByRole('button', { name: 'Record again' }))
        await screen.findByRole('button', { name: 'Stop recording and check' })
        expect(screen.queryByTestId('pronunciation-feedback')).not.toBeInTheDocument()
      }
    }

    expect(api.submitPracticePronunciationAttempt).toHaveBeenCalledTimes(4)
    fireEvent.click(screen.getByRole('button', { name: 'Continue to Recap' }))
    expect(await screen.findByTestId('practice-review-level-3')).toBeInTheDocument()
  })

  it('enables My Voice after recording, plays via click and [P], and clears on step change', async () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:mock-voice-url')
    const revokeObjectURL = vi.fn()
    const play = vi.fn().mockResolvedValue(undefined)
    const pause = vi.fn()
    const AudioMock = vi.fn().mockImplementation(function (this: Record<string, unknown>, src: string) {
      this.src = src
      this.play = play
      this.pause = pause
    })
    vi.stubGlobal('Audio', AudioMock)
    const originalCreateObjectURL = URL.createObjectURL
    const originalRevokeObjectURL = URL.revokeObjectURL
    URL.createObjectURL = createObjectURL
    URL.revokeObjectURL = revokeObjectURL

    try {
      renderSession(at('pronunciation'))
      const myVoiceButton = await screen.findByRole('button', { name: 'Play my voice' })
      expect(myVoiceButton).toBeDisabled()

      const assessment: PronunciationAssessment = {
        correct: true,
        accuracyScore: 92,
        feedbackMode: 'word',
        words: [{ text: 'alpha', accuracyScore: 92, units: [] }],
      }
      vi.mocked(api.submitPracticePronunciationAttempt).mockResolvedValue({
        itemId: item.itemId,
        assessment,
        isCorrect: true,
        attemptNumber: 1,
        attemptsRemaining: null,
        nextStep: 'recap',
        currentItemIndex: 0,
        status: 'active',
      })

      fireEvent.click(screen.getByRole('button', { name: 'Start recording' }))
      await screen.findByRole('button', { name: 'Stop recording and check' })
      await act(async () => { await audio.callback!(new Blob(['audio'])) })

      await waitFor(() => expect(screen.getByRole('button', { name: 'Play my voice' })).toBeEnabled())
      expect(createObjectURL).toHaveBeenCalledTimes(1)

      fireEvent.click(screen.getByRole('button', { name: 'Play my voice' }))
      expect(AudioMock).toHaveBeenCalledWith('blob:mock-voice-url')
      expect(play).toHaveBeenCalledTimes(1)

      fireEvent.keyDown(document.body, { key: 'p' })
      expect(play).toHaveBeenCalledTimes(2)

      fireEvent.click(screen.getByRole('button', { name: 'Continue to Recap' }))
      await screen.findByTestId('practice-review-level-3')
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-voice-url')
    } finally {
      URL.createObjectURL = originalCreateObjectURL
      URL.revokeObjectURL = originalRevokeObjectURL
      vi.unstubAllGlobals()
    }
  })

  it('keeps wrong pronunciation feedback until tapping mic again replaces it', async () => {
    renderSession(at('pronunciation'))
    const assessment: PronunciationAssessment = {
      correct: false,
      accuracyScore: 55,
      feedbackMode: 'word',
      words: [{ text: 'alpha', accuracyScore: 55, units: [] }],
    }
    vi.mocked(api.submitPracticePronunciationAttempt)
      .mockResolvedValueOnce({ itemId: item.itemId, assessment, isCorrect: false, attemptNumber: 1, attemptsRemaining: null, nextStep: 'pronunciation', currentItemIndex: 0, status: 'active' })
      .mockResolvedValueOnce({ itemId: item.itemId, assessment: { ...assessment, words: [{ text: 'alpha', accuracyScore: 75, units: [] }] }, isCorrect: false, attemptNumber: 2, attemptsRemaining: null, nextStep: 'pronunciation', currentItemIndex: 0, status: 'active' })

    fireEvent.click(await screen.findByRole('button', { name: 'Start recording' }))
    await screen.findByRole('button', { name: 'Stop recording and check' })
    await act(async () => { await audio.callback!(new Blob(['audio'])) })
    expect(screen.getByRole('button', { name: 'Red syllable alpha' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Record again' }))
    await screen.findByRole('button', { name: 'Stop recording and check' })
    expect(screen.queryByTestId('pronunciation-feedback')).not.toBeInTheDocument()
    expect(api.retryPracticeStep).not.toHaveBeenCalled()

    await act(async () => { await audio.callback!(new Blob(['audio'])) })
    expect(screen.getByRole('button', { name: 'Yellow syllable alpha' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Red syllable alpha' })).not.toBeInTheDocument()
    expect(startPcmRecording).toHaveBeenCalledTimes(2)
  })

  it('automatically advances when the answer was saved but its response was lost', async () => {
    renderSession()
    await screen.findByRole('textbox')
    vi.mocked(api.submitPracticeAnswer).mockRejectedValue(new Error('response lost'))
    vi.mocked(api.getPracticeSession).mockResolvedValue(at('wordToMeaning'))
    await answer()
    expect(await screen.findByText('first')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(api.submitPracticeAnswer).toHaveBeenCalledTimes(1)
  })

  it('retains an unsaved answer and reuses its request id only on manual retry', async () => {
    renderSession()
    await screen.findByRole('textbox')
    vi.mocked(api.submitPracticeAnswer)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ itemId: item.itemId, step: 'dictation', correctness: false, canRetry: true, nextStep: 'dictation', currentItemIndex: 0, status: 'active' })
    await answer()
    await waitFor(() => expect(api.getPracticeSession).toHaveBeenCalledTimes(2))
    expect(screen.getByRole('textbox')).toHaveValue('alpha')
    expect(api.submitPracticeAnswer).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Check Answer' })).toBeEnabled())
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' })
    await waitFor(() => expect(api.submitPracticeAnswer).toHaveBeenCalledTimes(2))
    expect(vi.mocked(api.submitPracticeAnswer).mock.calls[0][1].requestId).toBe(vi.mocked(api.submitPracticeAnswer).mock.calls[1][1].requestId)
  })

  it('blocks resubmission until disconnected progress can be checked', async () => {
    renderSession()
    await screen.findByRole('textbox')
    vi.mocked(api.submitPracticeAnswer).mockRejectedValue(new Error('lost'))
    vi.mocked(api.getPracticeSession).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(at('wordToMeaning'))
    await answer()
    const retry = await screen.findByRole('button', { name: 'Retry connection' })
    expect(screen.getByRole('textbox')).toHaveValue('alpha')
    expect(screen.getByRole('button', { name: 'Check Answer' })).toBeDisabled()
    fireEvent.click(retry)
    expect(await screen.findByText('first')).toBeInTheDocument()
    expect(api.submitPracticeAnswer).toHaveBeenCalledTimes(1)
  })

  it('recognizes a saved wrong answer without counting a retry or advancing', async () => {
    renderSession()
    await screen.findByRole('textbox')
    vi.mocked(api.submitPracticeAnswer).mockImplementation(async (_id, input) => {
      vi.mocked(api.getPracticeSession).mockResolvedValue({
        ...session,
        items: [{
          ...item,
          attemptCount: 1,
          lastAttempt: { requestId: input.requestId!, step: 'dictation', correctness: false, isSkip: false, attemptNumber: null, assessment: null },
        }, session.items[1]],
      })
      throw new Error('response lost')
    })
    await answer()
    expect(await screen.findByText(/Not quite/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Continue' })).not.toBeInTheDocument()
    expect(api.submitPracticeAnswer).toHaveBeenCalledTimes(1)
  })

  it('keeps the selected Recap level and exact failure toast for manual Next Word retry', async () => {
    renderSession(at('recap'))
    vi.mocked(api.setPracticeReviewLevel)
      .mockRejectedValueOnce(new Error('failed'))
      .mockResolvedValueOnce({ status: 'added', itemCompleted: true, currentItemIndex: 1 })

    fireEvent.click(await screen.findByTestId('practice-review-level-3'))
    expect(api.setPracticeReviewLevel).not.toHaveBeenCalled()
    expect(screen.getByTestId('practice-review-level-3')).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: 'Next Word' }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Fail to add word to review, please try again'))
    expect(screen.getByRole('alert')).toHaveTextContent('Unable to save this practice result. Try again.')
    expect(screen.getByTestId('practice-review-level-3')).toHaveAttribute('aria-pressed', 'true')
    expect(api.setPracticeReviewLevel).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Next Word' }))
    await waitFor(() => expect(api.setPracticeReviewLevel).toHaveBeenCalledTimes(2))
    expect(vi.mocked(api.setPracticeReviewLevel).mock.calls[1][0].level).toBe(3)
    expect(await screen.findByRole('textbox')).toHaveValue('')
  })

  it('shows Recap as a word summary with 2-step Review level selection and Next Word', async () => {
    renderSession(at('recap'))
    vi.mocked(api.setPracticeReviewLevel).mockResolvedValue({ status: 'added', itemCompleted: true, currentItemIndex: 1 })

    expect(await screen.findByText('WORD RECAP')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'alpha' })).toBeInTheDocument()
    expect(screen.getByText('Alpha example.')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Type the word you hear' })).not.toBeInTheDocument()

    const nextButton = screen.getByRole('button', { name: 'Next Word' })
    expect(nextButton).toBeDisabled()

    fireEvent.click(screen.getByTestId('practice-review-level-3'))
    expect(api.setPracticeReviewLevel).not.toHaveBeenCalled()
    expect(nextButton).toBeEnabled()

    fireEvent.click(nextButton)
    await waitFor(() => expect(vi.mocked(api.setPracticeReviewLevel).mock.calls[0]?.[0]).toEqual(expect.objectContaining({ wordId: 'word-1', level: 3 })))
  })

  it('supports Recap keyboard shortcuts [0]-[5], [Tab] Listen, and [Enter] Next Word', async () => {
    const speak = vi.fn()
    const cancel = vi.fn()
    const getVoices = vi.fn().mockReturnValue([])
    const UtteranceMock = vi.fn().mockImplementation(function (this: Record<string, unknown>, text: string) {
      this.text = text
    })
    vi.stubGlobal('SpeechSynthesisUtterance', UtteranceMock)
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: { speak, cancel, getVoices },
    })

    try {
      renderSession(at('recap'))
      vi.mocked(api.setPracticeReviewLevel).mockResolvedValue({ status: 'added', itemCompleted: true, currentItemIndex: 1 })

      await screen.findByTestId('practice-review-level-3')
      fireEvent.keyDown(document.body, { key: 'Tab' })
      expect(speak).toHaveBeenCalledTimes(1)

      fireEvent.keyDown(document.body, { key: '3' })
      expect(screen.getByTestId('practice-review-level-3')).toHaveAttribute('aria-pressed', 'true')
      expect(api.setPracticeReviewLevel).not.toHaveBeenCalled()

      fireEvent.keyDown(document.body, { key: 'Enter' })
      await waitFor(() => expect(vi.mocked(api.setPracticeReviewLevel).mock.calls[0]?.[0]).toEqual(expect.objectContaining({ wordId: 'word-1', level: 3 })))
      expect(await screen.findByRole('textbox')).toHaveValue('')
    } finally {
      vi.unstubAllGlobals()
      Reflect.deleteProperty(window, 'speechSynthesis')
    }
  })

  it('advances Recap after a lost successful response without a failure toast or duplicate enrollment', async () => {
    renderSession(at('recap'))
    await screen.findByTestId('practice-review-level-3')
    vi.mocked(api.setPracticeReviewLevel).mockRejectedValue(new Error('lost'))
    vi.mocked(api.getPracticeSession).mockResolvedValue({
      ...session,
      currentItemIndex: 1,
      items: [{ ...item, currentStep: 'recap', isCompleted: true, selectedLevel: 3 }, session.items[1]],
    })
    fireEvent.click(screen.getByTestId('practice-review-level-3'))
    fireEvent.click(screen.getByRole('button', { name: 'Next Word' }))
    expect(await screen.findByRole('textbox')).toBeInTheDocument()
    expect(api.setPracticeReviewLevel).toHaveBeenCalledTimes(1)
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('uses server pronunciation feedback after a lost wrong result without rendering attempt counts', async () => {
    renderSession(at('pronunciation'))
    const assessment: PronunciationAssessment = {
      correct: false,
      accuracyScore: 76,
      feedbackMode: 'syllable',
      words: [{
        text: 'alpha',
        accuracyScore: 76,
        units: [],
        syllables: [{ text: 'a', accuracyScore: 55, phonemes: [{ text: 'a', correct: false, accuracyScore: 55 }] }],
      }],
    }
    vi.mocked(api.submitPracticePronunciationAttempt).mockImplementation(async (input) => {
      vi.mocked(api.getPracticeSession).mockResolvedValue({
        ...at('pronunciation'),
        items: [{
          ...item,
          currentStep: 'pronunciation',
          attemptCount: 2,
          pronunciationAttemptCount: 2,
          lastAttempt: { requestId: input.requestId!, step: 'pronunciation', correctness: false, isSkip: false, attemptNumber: 2, assessment },
        }, session.items[1]],
      })
      throw new Error('lost')
    })
    fireEvent.click(await screen.findByRole('button', { name: 'Start recording' }))
    await waitFor(() => expect(audio.callback).not.toBeNull())
    await act(async () => { await audio.callback!(new Blob(['audio'])) })
    expect(await screen.findByRole('button', { name: 'Red syllable /a/' })).toBeInTheDocument()
    expect(screen.queryByText(/Saved pronunciation attempts/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Continue to Recap' })).not.toBeInTheDocument()
    expect(api.submitPracticePronunciationAttempt).toHaveBeenCalledTimes(1)
  })

  it('redirects an already abandoned session without showing answer controls', async () => {
    renderSession({ ...session, status: 'abandoned' })
    expect(await screen.findByText('Practice decks')).toBeInTheDocument()
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('permanently deleted'))
    expect(api.submitPracticeAnswer).not.toHaveBeenCalled()
  })

  it('clears the old answer when a server refresh advances to another word', async () => {
    const client = renderSession()
    const input = await screen.findByRole('textbox')
    fireEvent.change(input, { target: { value: 'old answer' } })
    await act(async () => { client.setQueryData(practiceKeys.session('session-1'), { ...session, currentItemIndex: 1 }) })
    await waitFor(() => expect(screen.getByRole('textbox')).toHaveValue(''))
    expect(api.submitPracticeAnswer).not.toHaveBeenCalled()
  })

  it('recognizes completed results after the completion response is lost', async () => {
    renderSession({ ...session, currentItemIndex: session.items.length })
    const finish = await screen.findByRole('button', { name: 'Finish practice' })
    vi.mocked(api.completePracticeSession).mockRejectedValueOnce(new Error('lost'))
    vi.mocked(api.getPracticeSession).mockResolvedValue({ ...session, status: 'completed', currentItemIndex: session.items.length })
    fireEvent.click(finish)
    expect(await screen.findByText('Practice decks')).toBeInTheDocument()
    expect(api.completePracticeSession).toHaveBeenCalledTimes(1)
  })

  it('cancels recording and ignores late audio after abandonment is refetched', async () => {
    const client = renderSession(at('pronunciation'))
    fireEvent.click(await screen.findByRole('button', { name: 'Start recording' }))
    await waitFor(() => expect(audio.callback).not.toBeNull())
    await act(async () => { client.setQueryData(practiceKeys.session('session-1'), { ...session, status: 'abandoned' }) })
    expect(await screen.findByText('Practice decks')).toBeInTheDocument()
    expect(audio.cancel).toHaveBeenCalled()
    await act(async () => { await audio.callback!(new Blob(['late audio'])) })
    expect(api.submitPracticePronunciationAttempt).not.toHaveBeenCalled()
  })
})
