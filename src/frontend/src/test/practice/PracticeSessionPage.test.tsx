import { fireEvent, render, screen, within } from '@testing-library/react'
import { PracticeModeSurface } from '@/features/practice/components/session/PracticeModeSurface'
import { PracticeRecap } from '@/features/practice/components/session/PracticeRecap'
import type { PracticeReviewLevel } from '@/features/practice/api/practice.api'
import type { FlashcardCard } from '@/features/flashcards'

const card: FlashcardCard = {
  id: 'card-1',
  wordId: 'word-1',
  word: 'mitigate',
  wordClass: 'verb',
  ipaPronunciation: '/ˈmɪt.ɪ.ɡeɪt/',
  meaningVn: 'giảm nhẹ',
  meaningEn: 'make less severe',
  example: 'We mitigate risk.',
  isInReview: false,
  lapseCount: 0,
}

const modeDefaults = {
  card,
  typedAnswer: 'mitigate',
  feedback: null,
  isResolved: false,
  usesLargeAnswerLayout: true,
  pronunciationFeedback: null,
  recordingSupported: true,
  isRecording: false,
  isAssessmentPending: false,
  pronunciationError: null,
  onPlayAudio: vi.fn(),
  onAnswerChange: vi.fn(),
  onSubmit: vi.fn(),
  onSkip: vi.fn(),
  onContinue: vi.fn(),
  onStartRecording: vi.fn(),
  onStopRecording: vi.fn(),
}

describe('Practice session presentation', () => {
  it('renders Meaning-to-Word through explicit presentation props', () => {
    render(<PracticeModeSurface {...modeDefaults} mode="meaningToWord" />)

    expect(screen.getByText('What word matches this meaning?')).toBeInTheDocument()
    expect(screen.getByText('giảm nhẹ')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Type the word...')).toBeInTheDocument()
  })

  it('renders six review levels and keeps recap navigation independently callable', () => {
    const onSubmit = vi.fn()
    const onSelectLevel = vi.fn<(initialLevel: PracticeReviewLevel) => void>()
    const onSkip = vi.fn()
    render(<PracticeModeSurface {...modeDefaults} mode="dictation" onSubmit={onSubmit} />)

    fireEvent.click(screen.getByRole('button', { name: 'Submit Answer' }))
    expect(onSubmit).toHaveBeenCalledTimes(1)

    render(<PracticeRecap card={card} reviewStatus={null} isAddingToReview={false} isSaving={false} addError={false} saveError={false} isLastCard canGoPrevious={false} onPrevious={vi.fn()} onSelectLevel={onSelectLevel} onSkip={onSkip} />)
    expect(['New', 'Forgot', 'Uncertain', 'Remembered', 'Recalled', 'Mastered'].map((name) => screen.getByRole('button', { name }))).toHaveLength(6)

    fireEvent.click(screen.getByRole('button', { name: 'Mastered' }))
    expect(onSelectLevel).toHaveBeenCalledWith(5)
    fireEvent.click(within(screen.getByTestId('practice-answer-reveal')).getByRole('button', { name: 'Skip' }))
    expect(onSkip).toHaveBeenCalledTimes(1)
  })

  it('disables review levels for words already in Review while leaving skip available', () => {
    const onSelectLevel = vi.fn()
    const onSkip = vi.fn()
    render(<PracticeRecap card={card} reviewStatus="alreadyInReview" isAddingToReview={false} isSaving={false} addError={false} saveError={false} isLastCard={false} canGoPrevious onPrevious={vi.fn()} onSelectLevel={onSelectLevel} onSkip={onSkip} />)

    expect(screen.getByRole('status', { name: '' })).toHaveTextContent('Already in Review')
    for (const name of ['New', 'Forgot', 'Uncertain', 'Remembered', 'Recalled', 'Mastered']) {
      expect(screen.getByRole('button', { name })).toBeDisabled()
    }
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    expect(onSkip).toHaveBeenCalledTimes(1)
  })
})
