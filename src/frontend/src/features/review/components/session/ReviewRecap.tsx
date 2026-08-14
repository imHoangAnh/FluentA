import type { ReviewSessionWord } from '../../api/review.api'
import { formatIpa, formatWordClass, hasText } from './reviewFormatters'

type ReviewRecapProps = {
  word: ReviewSessionWord
  isLastWord: boolean
  onContinue: () => void
}

export function ReviewRecap({ word, isLastWord, onContinue }: ReviewRecapProps) {
  return (
    <div className="review-recap" data-testid="review-answer">
      <header className="review-recap__header">
        <h2>{word.word}{hasText(word.wordClass) ? <span> ({formatWordClass(word.wordClass)})</span> : null}</h2>
        {hasText(word.ipaPronunciation) ? <p>{formatIpa(word.ipaPronunciation)}</p> : null}
      </header>
      {hasText(word.meaningEn) || hasText(word.meaningVn) || hasText(word.example) || hasText(word.thesaurus) || hasText(word.collocation) ? (
        <div className="review-recap__details review-recap__details--inline">
          {hasText(word.meaningEn) ? <p><strong><em>Definition:</em></strong> {word.meaningEn}</p> : null}
          {hasText(word.meaningVn) ? <p><strong><em>Meaning:</em></strong> {word.meaningVn}</p> : null}
          {hasText(word.example) ? <p><strong><em>Example:</em></strong> {word.example}</p> : null}
          {hasText(word.thesaurus) ? <p><strong><em>Synonyms:</em></strong> {word.thesaurus}</p> : null}
          {hasText(word.collocation) ? <p><strong><em>Antonyms:</em></strong> {word.collocation}</p> : null}
        </div>
      ) : null}
      <button className="primary-button review-recap__continue" type="button" onClick={onContinue}>{isLastWord ? 'Finish review' : 'Continue'}</button>
    </div>
  )
}
