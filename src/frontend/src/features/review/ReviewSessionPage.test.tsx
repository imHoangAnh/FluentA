import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/render'
import { ReviewSessionPage } from './ReviewSessionPage'
import * as reviewApi from './api/review.api'
import * as reviewSettingsApi from './api/review-settings.api'
import * as flashcardsApi from '@/features/flashcards'

vi.mock('./api/review.api')
vi.mock('./api/review-settings.api')
vi.mock('@/features/flashcards')

describe('ReviewSessionPage keyboard shortcuts', () => {
  it('supports Enter to submit typed answer in text modes', async () => {
    vi.mocked(reviewSettingsApi.getReviewSettings).mockResolvedValue({
      dailyLimit: 20,
      recapAfterAnswer: true,
    })

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
      startDisposition: 'started',
      startedAt: '2026-08-07',
      totalWords: 1,
      startOptions: {
        remainingWords: 1,
        hasActiveSameDaySession: false,
        requiresDecision: false,
      },
      words: [
        {
          wordId: 'w1',
          word: 'apple',
          meaningVn: 'quả táo',
          meaningEn: 'a fruit',
          wordClass: 'Noun',
          ipaPronunciation: 'æp.əl',
          example: 'An apple a day',
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

    await screen.findByRole('option', { name: /board 1/i })
    const select = screen.getByRole('combobox', { name: /vocabulary board/i })
    fireEvent.change(select, { target: { value: 'b1' } })

    const startBtn = await screen.findByRole('button', { name: /start review/i })
    expect(startBtn).not.toBeDisabled()
    fireEvent.click(startBtn)

    const input = await screen.findByPlaceholderText('Enter the target word')
    fireEvent.change(input, { target: { value: 'apple' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(reviewApi.submitReview).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 's1',
          wordId: 'w1',
          correct: true,
        }),
        expect.anything(),
      )
    })
  })

  it('triggers speech synthesis when Tab is pressed', async () => {
    const speakSpy = vi.fn()
    window.speechSynthesis = {
      cancel: vi.fn(),
      speak: speakSpy,
      getVoices: () => [],
    } as unknown as SpeechSynthesis
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    window.SpeechSynthesisUtterance = vi.fn().mockImplementation(function (this: any, text: string) {
      this.text = text
      return this
    }) as any

    vi.mocked(reviewSettingsApi.getReviewSettings).mockResolvedValue({
      dailyLimit: 20,
      recapAfterAnswer: true,
    })

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
      startDisposition: 'started',
      startedAt: '2026-08-07',
      totalWords: 1,
      startOptions: {
        remainingWords: 1,
        hasActiveSameDaySession: false,
        requiresDecision: false,
      },
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

    await screen.findByRole('option', { name: /board 1/i })
    const select = screen.getByRole('combobox', { name: /vocabulary board/i })
    fireEvent.change(select, { target: { value: 'b1' } })

    const startBtn = await screen.findByRole('button', { name: /start review/i })
    expect(startBtn).not.toBeDisabled()
    fireEvent.click(startBtn)

    await screen.findByText('Listen, then type the spoken word')

    fireEvent.keyDown(window, { key: 'Tab' })
    expect(speakSpy).toHaveBeenCalled()
  })
})
