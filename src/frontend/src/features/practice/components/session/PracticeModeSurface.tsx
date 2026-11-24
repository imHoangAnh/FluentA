import { ArrowRight, CheckCircle2, SkipForward, XCircle } from 'lucide-react'
import type { PronunciationAssessment } from '@/features/pronunciation'
import type { PracticeExerciseMode, PracticeSessionItem } from '../../api/practice.api'
import { PracticeAnswerForm } from './PracticeAnswerForm'
import { PracticeDictationMode } from './PracticeDictationMode'
import { PracticeWordToMeaningMode } from './PracticeWordToMeaningMode'
import { PracticePronunciationMode } from './PracticePronunciationMode'
import { hasText } from './practiceFormatters'

type PracticeModeSurfaceProps = {
  mode: PracticeExerciseMode
  item: PracticeSessionItem
  typedAnswer: string
  selectedSlotId: string | null
  feedback: 'correct' | 'wrong' | null
  isResolved: boolean
  isBusy: boolean
  pronunciationFeedback: PronunciationAssessment | null
  recordingSupported: boolean
  isRecording: boolean
  hasRecordedAudio: boolean
  pronunciationError: string | null
  onPlayAudio: () => void
  onPlayMyVoice: () => void
  onAnswerChange: (value: string) => void
  onSubmit: () => void
  onSelectSlot: (slotId: string) => void
  onSkip: () => void
  onContinue: () => void
  onRetry: () => void
  onStartRecording: () => void
  onStopRecording: () => void
}

const stepEyebrows: Record<PracticeExerciseMode, string> = {
  dictation: 'STEP 1 OF 3  •  DICTATION',
  wordToMeaning: 'STEP 2 OF 3  •  WORD TO MEANING',
  pronunciation: 'STEP 3 OF 3  •  PRONUNCIATION',
}

const prompts: Record<PracticeExerciseMode, string> = {
  dictation: 'Listen to the audio, type the word',
  wordToMeaning: 'Read the word and context, then click the correct meaning.',
  pronunciation: 'Listen to the word, then record your pronunciation.',
}

export function PracticeModeSurface({
  mode,
  item,
  typedAnswer,
  selectedSlotId,
  feedback,
  isResolved,
  isBusy,
  pronunciationFeedback,
  recordingSupported,
  isRecording,
  hasRecordedAudio,
  pronunciationError,
  onPlayAudio,
  onPlayMyVoice,
  onAnswerChange,
  onSubmit,
  onSelectSlot,
  onSkip,
  onContinue,
  onRetry,
  onStartRecording,
  onStopRecording,
}: PracticeModeSurfaceProps) {
  const feedbackDescription = mode === 'dictation'
    ? 'Try again or skip this word.'
    : 'Choose another answer or skip this word.'

  return (
    <div className={`practice-exercise practice-exercise--${mode}${feedback ? ` practice-exercise--${feedback}` : ''}`}>
      <div className="practice-prompt-stack">
        <span className="practice-eyebrow">{stepEyebrows[mode]}</span>
        <h2 className="practice-exercise__prompt">
          {mode === 'wordToMeaning' && !hasText(item.context)
            ? 'Read the word, then click the correct meaning.'
            : prompts[mode]}
        </h2>
      </div>

      <div className="practice-exercise__body">
        {mode === 'dictation' ? (
          <>
            <PracticeDictationMode onPlayAudio={onPlayAudio} />
            <PracticeAnswerForm
              typedAnswer={typedAnswer}
              isResolved={isResolved}
              isBusy={isBusy}
              onAnswerChange={onAnswerChange}
              onSubmit={onSubmit}
            />
          </>
        ) : null}

        {mode === 'wordToMeaning' ? (
          <PracticeWordToMeaningMode
            item={item}
            selectedSlotId={selectedSlotId}
            isResolved={isResolved}
            isBusy={isBusy}
            feedback={feedback}
            onSelect={onSelectSlot}
          />
        ) : null}

        {mode === 'pronunciation' ? (
          <PracticePronunciationMode
            item={item}
            assessment={pronunciationFeedback}
            recordingSupported={recordingSupported}
            isRecording={isRecording}
            isAssessmentPending={isBusy}
            isResolved={isResolved}
            hasRecordedAudio={hasRecordedAudio}
            error={pronunciationError}
            onPlayAudio={onPlayAudio}
            onPlayMyVoice={onPlayMyVoice}
            onStartRecording={onStartRecording}
            onStopRecording={onStopRecording}
            onRetry={onRetry}
          />
        ) : null}
      </div>

      {feedback && mode !== 'pronunciation' ? (
        <div className={`practice-feedback-banner practice-feedback-banner--${feedback}`} role="status" aria-live="polite">
          {feedback === 'correct' ? (
            <>
              <CheckCircle2 size={16} aria-hidden="true" />
              <strong>Correct</strong>
            </>
          ) : (
            <>
              <XCircle size={16} aria-hidden="true" />
              <strong>Not quite</strong>
              <span>{isResolved ? 'Press Enter or continue below.' : feedbackDescription}</span>
            </>
          )}
        </div>
      ) : null}

      <div className="practice-action-row">
        {mode !== 'pronunciation' && isResolved && feedback === 'correct' ? (
          <button className="practice-btn-secondary" type="button" onClick={onRetry} disabled={isBusy}>
            Try Again
          </button>
        ) : !isResolved ? (
          <button className="practice-btn-secondary" type="button" onClick={onSkip} disabled={isBusy || isRecording}>
            {mode === 'pronunciation' ? <SkipForward size={14} aria-hidden="true" /> : null}
            <span>Skip</span>
          </button>
        ) : (
          <span />
        )}

        {mode === 'dictation' && !isResolved ? (
          <button
            className="practice-btn-primary"
            type="button"
            onClick={onSubmit}
            disabled={isBusy || !typedAnswer.trim()}
          >
            <span>Check Answer</span>
            <ArrowRight size={15} aria-hidden="true" />
          </button>
        ) : isResolved ? (
          <button className="practice-btn-primary" type="button" onClick={onContinue} disabled={isBusy}>
            <span>{mode === 'pronunciation' ? 'Continue to Recap' : 'Continue'}</span>
            <ArrowRight size={15} aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </div>
  )
}
