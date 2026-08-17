import type { FlashcardCard } from '@/features/flashcards'
import { PracticeCompletion } from './PracticeCompletion'
import { formatIpa, formatWordClass, hasText } from './practiceFormatters'

type PracticeReviewStatus = 'added' | 'alreadyInReview'

type PracticeRecapProps = {
  card: FlashcardCard
  reviewStatus: PracticeReviewStatus | null
  isAddingToReview: boolean
  isSaving: boolean
  addError: boolean
  saveError: boolean
  isLastCard: boolean
  onPrevious: () => void
  onAddToReview: () => void
  onNext: () => void
  onFinish: () => void
}

export function PracticeRecap({ card, reviewStatus, isAddingToReview, isSaving, addError, saveError, isLastCard, onPrevious, onAddToReview, onNext, onFinish }: PracticeRecapProps) {
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

      <div className="practice-recap-actions">
        <button className="practice-recap__nav-button" type="button" onClick={onPrevious}>Previous</button>
        {reviewStatus === 'alreadyInReview' ? <button className="practice-recap__add-button" type="button" disabled>Already in Review</button>
          : reviewStatus === 'added' ? <button className="practice-recap__add-button" type="button" disabled>Added</button>
            : <button className="practice-recap__add-button" type="button" onClick={onAddToReview} disabled={isAddingToReview}>Add to Review</button>}
        {isLastCard ? <PracticeCompletion isSaving={isSaving} onFinish={onFinish} /> : <button className="practice-recap__nav-button" type="button" onClick={onNext} data-testid="practice-next-card">Next</button>}
      </div>
      {addError ? <p className="flashcard-status flashcard-status--error">Unable to add this word to Review. Try again.</p> : null}
      {saveError ? <p className="flashcard-status flashcard-status--error">Unable to save this practice result. Try again.</p> : null}
    </div>
  )
}
