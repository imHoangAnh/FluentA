import type { FlashcardCard } from '@/features/flashcards'
import type { PracticeReviewLevel } from '../../api/practice.api'
import { formatIpa, formatWordClass, hasText } from './practiceFormatters'

type PracticeReviewStatus = 'added' | 'alreadyInReview'

const reviewLevels: ReadonlyArray<{ level: PracticeReviewLevel; label: string }> = [
  { level: 0, label: 'New' },
  { level: 1, label: 'Forgot' },
  { level: 2, label: 'Uncertain' },
  { level: 3, label: 'Remembered' },
  { level: 4, label: 'Recalled' },
  { level: 5, label: 'Mastered' },
]

type PracticeRecapProps = {
  card: FlashcardCard
  reviewStatus: PracticeReviewStatus | null
  isAddingToReview: boolean
  isSaving: boolean
  addError: boolean
  saveError: boolean
  isLastCard: boolean
  canGoPrevious: boolean
  onPrevious: () => void
  onSelectLevel: (initialLevel: PracticeReviewLevel) => void
  onSkip: () => void
}

export function PracticeRecap({ card, reviewStatus, isAddingToReview, isSaving, addError, saveError, isLastCard, canGoPrevious, onPrevious, onSelectLevel, onSkip }: PracticeRecapProps) {
  const controlsDisabled = isAddingToReview || isSaving
  const levelsDisabled = controlsDisabled || reviewStatus !== null

  return (
    <div className="review-recap practice-recap" data-testid="practice-answer-reveal">
      <header className="review-recap__header">
        <h2>
          {card.word}
          {hasText(card.wordClass) ? <span> ({formatWordClass(card.wordClass)})</span> : null}
        </h2>
        {hasText(card.ipaPronunciation) ? <p>{formatIpa(card.ipaPronunciation)}</p> : null}
      </header>

      {hasText(card.meaningEn) || hasText(card.meaningVn) || hasText(card.example) || hasText(card.synonyms) || hasText(card.antonyms) ? (
        <div className="review-recap__details practice-recap__details">
          {hasText(card.meaningEn) ? <p><strong><em>Definition:</em></strong> {card.meaningEn}</p> : null}
          {hasText(card.meaningVn) ? <p><strong><em>Meaning:</em></strong> {card.meaningVn}</p> : null}
          {hasText(card.example) ? <p><strong><em>Example:</em></strong> {card.example}</p> : null}
          {hasText(card.synonyms) ? <p><strong><em>Synonyms:</em></strong> {card.synonyms}</p> : null}
          {hasText(card.antonyms) ? <p><strong><em>Antonyms:</em></strong> {card.antonyms}</p> : null}
        </div>
      ) : null}

      {reviewStatus === 'alreadyInReview' ? <p className="practice-recap-status" role="status">Already in Review</p> : null}
      {reviewStatus === 'added' ? <p className="practice-recap-status" role="status">Added to Review</p> : null}
      {isAddingToReview ? <p className="practice-recap-status" role="status" aria-live="polite">Adding to Review...</p> : null}

      <div className="practice-recap-actions" data-testid="practice-recap-actions" aria-busy={controlsDisabled}>
        <button
          className="practice-recap__nav-button practice-recap__nav-button--previous"
          type="button"
          onClick={onPrevious}
          disabled={!canGoPrevious || controlsDisabled}
          aria-label="Previous"
          title="Previous practice step"
        >
          <span aria-hidden="true">&lt;</span>
        </button>

        <div className="practice-recap__levels" role="group" aria-label="Choose initial review level">
          {reviewLevels.map(({ level, label }) => (
            <button
              key={level}
              className="practice-recap__level-button"
              type="button"
              onClick={() => onSelectLevel(level)}
              disabled={levelsDisabled}
              data-testid={`practice-review-level-${level}`}
              title={`Add to Review as ${label}`}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          className="practice-recap__nav-button practice-recap__nav-button--next"
          type="button"
          onClick={onSkip}
          disabled={controlsDisabled}
          aria-label="Skip"
          title={isLastCard ? 'Skip and finish practice' : 'Skip to the next card'}
        >
          <span aria-hidden="true">&gt;</span>
        </button>
      </div>

      {addError ? <p className="flashcard-status flashcard-status--error" role="alert">Unable to add this word to Review. Try again.</p> : null}
      {saveError ? <p className="flashcard-status flashcard-status--error" role="alert">Unable to save this practice result. Try again.</p> : null}
    </div>
  )
}
