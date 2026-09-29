import { Mic, Square, Volume2 } from 'lucide-react'
import type { ReviewSessionItem } from '../../api/review.api'
import { formatIpa, hasText } from './reviewFormatters'

export type ReviewFeedback = {
  kind: 'correct' | 'wrong' | 'retry'
  title: string
  message: string
  item: ReviewSessionItem
}

type ReviewModeSurfaceProps = {
  item: ReviewSessionItem
  typedAnswer: string
  feedback: ReviewFeedback | null
  isBusy: boolean
  isRecording: boolean
  recordingSupported: boolean
  pronunciationError: string | null
  onPlayAudio: () => void
  onAnswerChange: (value: string) => void
  onCheckAnswer: () => void
  onSkip: () => void
  onContinue: () => void
  onToggleRecording: () => void
}

const prompts = {
  dictation: 'Listen to the audio, type the word, then press Enter.',
  meaningToWord: 'Read the meaning and context, type the word, then press Enter.',
  listenAndRepeat: 'Listen to the word, then record your pronunciation.',
} satisfies Record<ReviewSessionItem['mode'], string>

export function ReviewModeSurface({ item, typedAnswer, feedback, isBusy, isRecording, recordingSupported, pronunciationError, onPlayAudio, onAnswerChange, onCheckAnswer, onSkip, onContinue, onToggleRecording }: ReviewModeSurfaceProps) {
  const isPronunciation = item.mode === 'listenAndRepeat'
  const contextText = hasText(item.context) ? item.context : item.example

  return (
    <div className="review-figma-session__mode-surface">
      <h2 className="review-figma-session__prompt">{prompts[item.mode]}</h2>

      <div className={`review-figma-session__exercise-content${feedback ? ' review-figma-session__exercise-content--feedback' : ''}`}>
        {item.mode === 'dictation' ? (
          <div className="review-figma-session__dictation-prompt">
            <button className="review-figma-session__audio-disc" type="button" aria-label="Play word" aria-keyshortcuts="Tab" title="Play audio (Tab)" onClick={onPlayAudio} disabled={isBusy}>
              <Volume2 size={32} strokeWidth={2.26667} color="var(--review-green)" aria-hidden="true" />
            </button>
            <strong>Play word</strong>
            <span>Listen again whenever you need.</span>
          </div>
        ) : null}

        {item.mode === 'meaningToWord' ? (
          <div className="review-figma-session__meaning-card">
            <span className="review-figma-session__meaning-label">Meaning</span>
            <strong className="review-figma-session__meaning-value">{hasText(item.meaning) ? item.meaning : 'No meaning was saved for this word.'}</strong>
            {hasText(contextText) ? (
              <>
                <span className="review-figma-session__meaning-label">Usage context</span>
                <p className="review-figma-session__meaning-context">{contextText}</p>
              </>
            ) : null}
          </div>
        ) : null}

        {isPronunciation ? (
          <div className="review-figma-session__pronunciation-content">
            <strong className="review-figma-session__pronunciation-word">{item.word}</strong>
            {hasText(item.ipaPronunciation) || hasText(item.type) ? (
              <span className="review-figma-session__pronunciation-details">
                {hasText(item.ipaPronunciation) ? formatIpa(item.ipaPronunciation ?? '') : ''}
                {hasText(item.ipaPronunciation) && hasText(item.type) ? '  ·  ' : ''}
                {hasText(item.type) ? item.type : ''}
              </span>
            ) : null}
            <div className="review-figma-session__pronunciation-controls">
              <button className="review-figma-session__listen-button" type="button" aria-label="Listen to pronunciation" aria-keyshortcuts="Tab" title="Listen (Tab)" onClick={onPlayAudio} disabled={isBusy}>
                <span>Listen</span>
                <Volume2 size={20} strokeWidth={1.41667} color="var(--review-green)" aria-hidden="true" />
              </button>
              <button
                className={`review-figma-session__record-button${isRecording ? ' review-figma-session__record-button--recording' : ''}`}
                type="button"
                aria-label={isRecording ? 'Stop recording' : 'Start recording'}
                aria-keyshortcuts={isRecording ? 'Space' : 'R'}
                title={isRecording ? 'Stop recording (Space)' : 'Record (R)'}
                onClick={onToggleRecording}
                disabled={isBusy || (!isRecording && (!recordingSupported || item.pronunciationAttemptCount >= 2))}
              >
                {isRecording ? <><Square size={16} fill="currentColor" aria-hidden="true" /> Stop</> : <><Mic size={18} aria-hidden="true" /> Record</>}
              </button>
            </div>
            <span className="review-figma-session__attempt">Attempt {Math.min(item.pronunciationAttemptCount + 1, 2)} of 2</span>
            {pronunciationError ? <p className="review-figma-session__error" role="alert">{pronunciationError}</p> : null}
          </div>
        ) : null}

        {!isPronunciation ? (
          <input
            id="review-answer-input"
            className="review-figma-session__answer-input"
            aria-label={item.mode === 'meaningToWord' ? 'Type the word' : 'Type the word you hear'}
            autoComplete="off"
            value={typedAnswer}
            disabled={isBusy || Boolean(feedback)}
            placeholder={item.mode === 'meaningToWord' ? 'Type the word...' : 'Type the word you hear...'}
            onChange={(event) => onAnswerChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && typedAnswer.trim().length > 0) {
                event.preventDefault()
                event.stopPropagation()
                onCheckAnswer()
              }
            }}
          />
        ) : null}

      </div>

      {feedback ? (
        <div className={`review-figma-session__feedback review-figma-session__feedback--${feedback.kind === 'correct' ? 'correct' : 'wrong'}`} role="status" aria-live="polite">
          <strong>{feedback.title}</strong>
          <span>{feedback.message}</span>
        </div>
      ) : null}

      <div className="review-figma-session__exercise-actions">
        {!isPronunciation && !feedback ? <button className="review-figma-session__action-button learning-touch-submit" type="button" onClick={onCheckAnswer} disabled={isBusy || !typedAnswer.trim()}>Check answer</button> : null}
        {feedback ? (
          <button className="review-figma-session__action-button" type="button" onClick={onContinue}>Continue</button>
        ) : !isPronunciation ? (
          <>
            <button className="review-figma-session__submit-button" type="button" onClick={onCheckAnswer} disabled={isBusy || typedAnswer.trim().length === 0}>Check answer</button>
            <button className="review-figma-session__action-button" type="button" title="Skip this word (Esc)" onClick={onSkip} disabled={isBusy}>Skip</button>
          </>
        ) : null}
      </div>
    </div>
  )
}
