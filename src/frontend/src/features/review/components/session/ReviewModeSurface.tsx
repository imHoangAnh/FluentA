import { Mic, Square, Volume2 } from 'lucide-react'
import type { ReviewSessionWord } from '../../api/review.api'
import type { ReviewMode } from '../../api/review.api'
import { formatIpa, hasText } from './reviewFormatters'

type ReviewRenderMode = Exclude<ReviewMode, 'random'>

type ReviewModeSurfaceProps = {
  mode: ReviewRenderMode
  word: ReviewSessionWord
  typedAnswer: string
  usesLargeAnswerLayout: boolean
  isAutoAdvancing: boolean
  isSubmitting: boolean
  isRecording: boolean
  isAssessmentPending: boolean
  recordingSupported: boolean
  pronunciationAttempts: number
  pronunciationFailed: boolean
  pronunciationError: string | null
  onPlayAudio: () => void
  onAnswerChange: (value: string) => void
  onCheckAnswer: () => void
  onSkip: () => void
  onStartRecording: () => void
  onStopRecording: () => void
}

const prompts: Record<ReviewRenderMode, string> = {
  dictation: 'Listen carefully, then type the word you hear',
  meaningToWord: 'What word matches this meaning?',
  pronunciation: 'Say the word naturally',
}

export function ReviewModeSurface({ mode, word, typedAnswer, usesLargeAnswerLayout, isAutoAdvancing, isSubmitting, isRecording, isAssessmentPending, recordingSupported, pronunciationAttempts, pronunciationFailed, pronunciationError, onPlayAudio, onAnswerChange, onCheckAnswer, onSkip, onStartRecording, onStopRecording }: ReviewModeSurfaceProps) {
  const isPronunciation = mode === 'pronunciation'

  return (
    <div className="review-exercise">
      <h2 className="review-exercise__prompt">{prompts[mode]}</h2>

      {mode === 'dictation' ? (
        <div className="review-exercise__stage review-exercise__stage--dictation">
          <div className="practice-dictation-audio-control">
            <button className="review-audio-action" type="button" aria-label="Play pronunciation" aria-keyshortcuts="Tab" title="Play audio (Tab)" onClick={onPlayAudio}><Volume2 size={32} /></button>
            <span>Play</span>
          </div>
        </div>
      ) : mode === 'meaningToWord' ? (
        <div className="review-exercise__stage review-meaning-card">
          {word.meaningVn ? <strong>{word.meaningVn}</strong> : null}
          {word.meaningEn ? <p>{word.meaningEn}</p> : null}
        </div>
      ) : (
        <div className="review-exercise__stage review-pronunciation-stage">
          <div className="review-pronunciation-target"><strong>{word.word}</strong>{hasText(word.ipaPronunciation) ? <span>{formatIpa(word.ipaPronunciation)}</span> : null}</div>
          <div className="review-pronunciation-controls">
            <button className="review-pronunciation-play-button" type="button" aria-label="Play pronunciation" aria-keyshortcuts="Tab" title="Play audio (Tab)" onClick={onPlayAudio}><Volume2 size={20} /></button>
            <button className={`review-record-button ${isRecording ? 'review-record-button--active' : ''}`} type="button" aria-label="Start recording" title="Record (R)" onClick={onStartRecording} disabled={isAutoAdvancing || isRecording || isAssessmentPending || pronunciationAttempts >= 2 || !recordingSupported}><Mic size={22} /></button>
            <button className="review-stop-button" type="button" aria-label="Stop recording" title="Stop (Space)" onClick={onStopRecording} disabled={!isRecording}><Square size={18} fill="currentColor" /></button>
          </div>
          <span className="review-pronunciation-attempt">Attempt {Math.min(pronunciationAttempts + 1, 2)} of 2</span>
          {pronunciationError ? <p className="flashcard-status flashcard-status--error">{pronunciationError}</p> : null}
        </div>
      )}

      {!isPronunciation ? (
        <div className="review-answer-form">
          {mode === 'meaningToWord' ? <label htmlFor="review-answer-input">Type the word</label> : null}
          <input
            id="review-answer-input"
            value={typedAnswer}
            disabled={isAutoAdvancing || isSubmitting}
            placeholder={mode === 'meaningToWord' ? 'Type the word...' : 'Type your answer...'}
            onChange={(event) => onAnswerChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && typedAnswer.trim().length > 0) {
                event.preventDefault()
                event.stopPropagation()
                onCheckAnswer()
              }
            }}
          />
          <div className="review-exercise__actions">
            <button className={usesLargeAnswerLayout ? 'practice-dictation-submit' : 'primary-button review-submit-button'} type="button" title="Submit answer (Enter)" onClick={onCheckAnswer} disabled={typedAnswer.trim().length === 0 || isAutoAdvancing || isSubmitting}>{mode === 'dictation' ? 'Submit Answer' : 'Submit'}</button>
            <button className={usesLargeAnswerLayout ? 'practice-dictation-skip' : 'review-skip-button'} type="button" onClick={onSkip} disabled={isAutoAdvancing || isSubmitting}>Skip</button>
          </div>
        </div>
      ) : (
        <div className="review-exercise__actions">
          {pronunciationFailed ? <p className="practice-wrong-message" role="status" aria-live="polite">Wrong</p> : null}
          <button className="practice-dictation-skip" type="button" onClick={onSkip} disabled={isAutoAdvancing || isRecording || isAssessmentPending || isSubmitting}>Skip</button>
        </div>
      )}
    </div>
  )
}
