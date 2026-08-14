import { fireEvent, render, screen } from '@testing-library/react'
import { PracticeModeSurface } from '@/features/practice/components/session/PracticeModeSurface'
import { PracticeRecap } from '@/features/practice/components/session/PracticeRecap'
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

  it('keeps answer submission and recap completion actions independently callable', () => {
    const onSubmit = vi.fn()
    const onFinish = vi.fn()
    render(<PracticeModeSurface {...modeDefaults} mode="dictation" onSubmit={onSubmit} />)

    fireEvent.click(screen.getByRole('button', { name: 'Submit Answer' }))
    expect(onSubmit).toHaveBeenCalledTimes(1)

    render(<PracticeRecap card={card} reviewStatus={null} isAddingToReview={false} isSaving={false} addError={false} saveError={false} isLastCard onPrevious={vi.fn()} onAddToReview={vi.fn()} onNext={vi.fn()} onFinish={onFinish} />)
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }))
    expect(onFinish).toHaveBeenCalledTimes(1)
  })
})
