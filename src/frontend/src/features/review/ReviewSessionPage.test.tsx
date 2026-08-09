import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/render'
import { ReviewSessionPage } from './ReviewSessionPage'
import * as reviewApi from './api/review.api'
import * as flashcardsApi from '@/features/flashcards'

vi.mock('./api/review.api')
vi.mock('@/features/flashcards')

describe('ReviewSessionPage keyboard shortcuts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the compact full-height setup without a page title or empty-state panel', async () => {
    vi.mocked(flashcardsApi.listBoards).mockResolvedValue([])

    renderWithProviders(<ReviewSessionPage />)

    expect(await screen.findByTestId('review-page')).toHaveClass('h-full', 'overflow-hidden')
    expect(screen.getByText('Vocabulary board')).toBeInTheDocument()
    expect(screen.getByTestId('review-setup-state')).toHaveTextContent('Select a board to start review')
    expect(screen.queryByText('Review', { exact: true })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Select a board to start review' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start review' })).toBeDisabled()
  })

  it('supports Enter to submit typed answer in text modes', async () => {

    vi.mocked(flashcardsApi.listBoards).mockResolvedValue([
      {
        boardId: 'b1',
        boardName: 'Board 1',
        boardLanguage: 'en',
        pages: [
          {
            pageId: 'p1',
            pageName: 'Page 1',
            isPracticed: true,
            words: [
              {
                id: 'c1',
                wordId: 'w1',
                word: 'apple',
                meaningVn: 'quả táo',
                meaningEn: 'a fruit',
                wordClass: 'Noun',
                ipaPronunciation: 'æp.əl',
                example: 'An apple a day',
                isInReview: true,
                nextReviewDate: '2026-08-07',
                lapseCount: 0,
              },
            ],
          },
        ],
      },
    ])

    vi.mocked(reviewApi.createReviewSession).mockResolvedValue({
      sessionId: 's1',
      boardId: 'b1',
      boardName: 'Board 1',
      orderType: 'sequential',
      mode: 'meaningToWord',
      startedAt: '2026-08-07',
      totalWords: 1,
      words: [
        {
          wordId: 'w1',
          word: 'apple',
          meaningVn: 'quả táo',
          meaningEn: 'a fruit',
          wordClass: '   ',
          ipaPronunciation: '',
          example: ' ',
          mode: 'meaningToWord',
        },
      ],
    })

    vi.mocked(reviewApi.submitReview).mockResolvedValue({
      reviewHistoryId: 'r1',
      wordId: 'w1',
      result: 'correct',
      levelBefore: 1,
      levelAfter: 2,
      lapseCount: 0,
      nextReviewDate: '2026-08-08',
    })

    renderWithProviders(<ReviewSessionPage />)

    const select = screen.getByRole('button', { name: /vocabulary board/i })
    fireEvent.click(select)
    fireEvent.click(await screen.findByRole('option', { name: /board 1/i }))

    const startBtn = await screen.findByRole('button', { name: /start review/i })
    expect(startBtn).not.toBeDisabled()
    fireEvent.click(startBtn)

    const input = await screen.findByPlaceholderText('Type the word...')
    fireEvent.change(input, { target: { value: 'apple' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(reviewApi.submitReview).toHaveBeenCalledTimes(1)
      expect(reviewApi.submitReview).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 's1',
          wordId: 'w1',
          correct: true,
        }),
        expect.anything(),
      )
    })

    expect(await screen.findByRole('button', { name: 'Finish review' }, { timeout: 3000 })).toBeInTheDocument()
    expect(screen.queryByText('Example')).not.toBeInTheDocument()
    expect(screen.queryByText('Synonyms')).not.toBeInTheDocument()
    expect(screen.queryByText('Antonyms')).not.toBeInTheDocument()
    expect(screen.queryByText('//')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'apple' })).toBeInTheDocument()
  })

  it('triggers speech synthesis when Tab is pressed', async () => {
    const speakSpy = vi.fn()
    window.speechSynthesis = {
      cancel: vi.fn(),
      speak: speakSpy,
      getVoices: () => [],
    } as unknown as SpeechSynthesis
    window.SpeechSynthesisUtterance = vi.fn().mockImplementation(function (this: { text?: string }, text: string) {
      this.text = text
      return this
    }) as unknown as typeof SpeechSynthesisUtterance

    vi.mocked(flashcardsApi.listBoards).mockResolvedValue([
      {
        boardId: 'b1',
        boardName: 'Board 1',
        boardLanguage: 'en',
        pages: [
          {
            pageId: 'p1',
            pageName: 'Page 1',
            isPracticed: true,
            words: [
              {
                id: 'c1',
                wordId: 'w1',
                word: 'banana',
                meaningVn: 'quả chuối',
                meaningEn: 'yellow fruit',
                wordClass: 'Noun',
                ipaPronunciation: 'bə.næn.ə',
                example: 'Yellow banana',
                isInReview: true,
                nextReviewDate: '2026-08-07',
                lapseCount: 0,
              },
            ],
          },
        ],
      },
    ])

    vi.mocked(reviewApi.createReviewSession).mockResolvedValue({
      sessionId: 's1',
      boardId: 'b1',
      boardName: 'Board 1',
      orderType: 'sequential',
      mode: 'dictation',
      startedAt: '2026-08-07',
      totalWords: 1,
      words: [
        {
          wordId: 'w1',
          word: 'banana',
          meaningVn: 'quả chuối',
          meaningEn: 'yellow fruit',
          wordClass: 'Noun',
          ipaPronunciation: 'bə.næn.ə',
          example: 'Yellow banana',
          mode: 'dictation',
        },
      ],
    })

    renderWithProviders(<ReviewSessionPage />)

    const select = screen.getByRole('button', { name: /vocabulary board/i })
    fireEvent.click(select)
    fireEvent.click(await screen.findByRole('option', { name: /board 1/i }))

    const startBtn = await screen.findByRole('button', { name: /start review/i })
    expect(startBtn).not.toBeDisabled()
    fireEvent.click(startBtn)

    const card = await screen.findByTestId('active-review-card')
    expect(card).toHaveClass('review-card--dictation')
    await screen.findByText('Listen carefully, then type the word you hear')

    fireEvent.keyDown(window, { key: 'Tab' })
    expect(speakSpy).toHaveBeenCalled()
  })

  it('renders the completed summary without the icon or Review complete label', async () => {
    vi.mocked(flashcardsApi.listBoards).mockResolvedValue([
      {
        boardId: 'b1',
        boardName: 'Board 1',
        boardLanguage: 'en',
        pages: [
          {
            pageId: 'p1',
            pageName: 'Page 1',
            isPracticed: true,
            words: [
              {
                id: 'c1',
                wordId: 'w1',
                word: 'apple',
                meaningVn: 'quả táo',
                meaningEn: 'a fruit',
                wordClass: 'Noun',
                ipaPronunciation: 'æp.əl',
                example: 'An apple a day',
                isInReview: true,
                nextReviewDate: '2026-08-07',
                lapseCount: 0,
              },
            ],
          },
        ],
      },
    ])

    vi.mocked(reviewApi.createReviewSession).mockResolvedValue({
      sessionId: 's1',
      boardId: 'b1',
      boardName: 'Board 1',
      orderType: 'sequential',
      mode: 'meaningToWord',
      startedAt: '2026-08-07',
      totalWords: 1,
      words: [
        {
          wordId: 'w1',
          word: 'apple',
          meaningVn: 'quả táo',
          meaningEn: 'a fruit',
          wordClass: 'Noun',
          ipaPronunciation: 'æp.əl',
          example: 'An apple a day',
          thesaurus: 'fruit, produce',
          collocation: 'vegetable',
          mode: 'meaningToWord',
        },
      ],
    })

    vi.mocked(reviewApi.submitReview).mockResolvedValue({
      reviewHistoryId: 'r1',
      wordId: 'w1',
      result: 'correct',
      levelBefore: 1,
      levelAfter: 2,
      lapseCount: 0,
      nextReviewDate: '2026-08-08',
    })

    renderWithProviders(<ReviewSessionPage />)

    fireEvent.click(screen.getByRole('button', { name: /vocabulary board/i }))
    fireEvent.click(await screen.findByRole('option', { name: /board 1/i }))
    fireEvent.click(await screen.findByRole('button', { name: /start review/i }))

    const input = await screen.findByPlaceholderText('Type the word...')
    fireEvent.change(input, { target: { value: 'apple' } })
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))

    const feedback = await screen.findByRole('status')
    expect(feedback).toHaveTextContent('CORRECT')
    expect(screen.getByTestId('active-review-card')).toHaveClass('review-card--feedback-correct')
    expect(screen.queryByText('What word matches this meaning?')).not.toBeInTheDocument()

    const finishReview = await screen.findByRole('button', { name: 'Finish review' }, { timeout: 3000 })
    expect(screen.getByTestId('active-review-card')).toHaveClass('review-card--meaningToWord')
    expect(screen.getByText('Definition:')).toBeInTheDocument()
    expect(screen.getByText('Meaning:')).toBeInTheDocument()
    expect(screen.getByText('Example:')).toBeInTheDocument()
    expect(screen.getByText('Synonyms:')).toBeInTheDocument()
    expect(screen.getByText('Antonyms:')).toBeInTheDocument()
    expect(screen.getByText('fruit, produce')).toBeInTheDocument()
    expect(screen.getByText('vegetable')).toBeInTheDocument()
    fireEvent.click(finishReview)

    const summary = await screen.findByTestId('review-summary')
    expect(summary).toHaveTextContent('Board 1')
    expect(summary).toHaveTextContent('1 correct and 0 wrong across 1 reviewed words.')
    expect(summary).toHaveTextContent('Done')
    expect(summary.querySelector('svg')).toBeNull()
    expect(screen.queryByText('Review complete', { exact: true })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(await screen.findByText('Vocabulary board')).toBeInTheDocument()
  })

  it('renders the pronunciation target, IPA, audio, record, and stop controls as one mode surface', async () => {
    vi.mocked(flashcardsApi.listBoards).mockResolvedValue([
      {
        boardId: 'b1',
        boardName: 'Board 1',
        boardLanguage: 'en',
        pages: [
          {
            pageId: 'p1',
            pageName: 'Page 1',
            isPracticed: true,
            words: [
              {
                id: 'c1',
                wordId: 'w1',
                word: 'go',
                meaningVn: 'đi',
                meaningEn: 'move from one place to another',
                wordClass: 'Verb',
                ipaPronunciation: 'ɡoʊ',
                example: 'Go home.',
                isInReview: true,
                nextReviewDate: '2026-08-07',
                lapseCount: 0,
              },
            ],
          },
        ],
      },
    ])
    vi.mocked(reviewApi.createReviewSession).mockResolvedValue({
      sessionId: 's1',
      boardId: 'b1',
      boardName: 'Board 1',
      orderType: 'shuffle',
      mode: 'pronunciation',
      startedAt: '2026-08-07',
      totalWords: 1,
      words: [
        {
          wordId: 'w1',
          word: 'go',
          meaningVn: 'đi',
          meaningEn: 'move from one place to another',
          wordClass: 'Verb',
          ipaPronunciation: 'ɡoʊ',
          example: 'Go home.',
          mode: 'pronunciation',
        },
      ],
    })

    renderWithProviders(<ReviewSessionPage />)
    fireEvent.click(screen.getByRole('button', { name: /vocabulary board/i }))
    fireEvent.click(await screen.findByRole('option', { name: /board 1/i }))
    fireEvent.click(screen.getByRole('button', { name: /^Pronunciation/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Shuffle' }))
    fireEvent.click(screen.getByRole('button', { name: /start review/i }))

    const card = await screen.findByTestId('active-review-card')
    expect(card).toHaveClass('review-card--pronunciation')
    expect(screen.getByText('Shuffle')).toBeInTheDocument()
    expect(screen.getByText('Say the word naturally')).toBeInTheDocument()
    expect(screen.getByText('go')).toBeInTheDocument()
    expect(screen.getByText('/ɡoʊ/')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Play pronunciation' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start recording' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Stop recording' })).toBeDisabled()
    expect(screen.getByText('Attempt 1 of 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument()
  })

  it('shows full-frame Wrong for two seconds and advances when recap is disabled', async () => {
    vi.mocked(flashcardsApi.listBoards).mockResolvedValue([
      {
        boardId: 'b1',
        boardName: 'Board 1',
        boardLanguage: 'en',
        pages: [
          {
            pageId: 'p1',
            pageName: 'Page 1',
            isPracticed: true,
            words: [
              {
                id: 'c1',
                wordId: 'w1',
                word: 'banana',
                meaningVn: 'quả chuối',
                meaningEn: 'yellow fruit',
                wordClass: 'Noun',
                ipaPronunciation: 'bə.næn.ə',
                example: 'A yellow banana.',
                isInReview: true,
                nextReviewDate: '2026-08-07',
                lapseCount: 0,
              },
            ],
          },
        ],
      },
    ])
    vi.mocked(reviewApi.createReviewSession).mockResolvedValue({
      sessionId: 's1',
      boardId: 'b1',
      boardName: 'Board 1',
      orderType: 'sequential',
      mode: 'dictation',
      startedAt: '2026-08-07',
      totalWords: 1,
      words: [
        {
          wordId: 'w1',
          word: 'banana',
          meaningVn: 'quả chuối',
          meaningEn: 'yellow fruit',
          wordClass: 'Noun',
          ipaPronunciation: 'bə.næn.ə',
          example: 'A yellow banana.',
          mode: 'dictation',
        },
      ],
    })
    vi.mocked(reviewApi.submitReview).mockResolvedValue({
      reviewHistoryId: 'r1',
      wordId: 'w1',
      result: 'wrong',
      levelBefore: 1,
      levelAfter: 0,
      lapseCount: 1,
      nextReviewDate: '2026-08-08',
    })

    renderWithProviders(<ReviewSessionPage />)
    fireEvent.click(screen.getByRole('button', { name: /vocabulary board/i }))
    fireEvent.click(await screen.findByRole('option', { name: /board 1/i }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Show recap after each answer' }))
    fireEvent.click(screen.getByRole('button', { name: /^Dictation/ }))
    fireEvent.click(screen.getByRole('button', { name: /start review/i }))
    fireEvent.click(await screen.findByRole('button', { name: 'Skip' }))

    expect(await screen.findByRole('status')).toHaveTextContent('WRONG')
    expect(screen.getByTestId('active-review-card')).toHaveClass('review-card--feedback-wrong')
    expect(screen.queryByTestId('review-answer')).not.toBeInTheDocument()

    const summary = await screen.findByTestId('review-summary', undefined, { timeout: 3000 })
    expect(summary).toHaveTextContent('0 correct and 1 wrong across 1 reviewed words.')
  })
})
