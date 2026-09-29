import type { PronunciationAssessment } from '@/features/pronunciation'
import type { PracticeSessionItem, PracticeStep } from '../../api/practice.api'
import { PracticeAnswerForm } from './PracticeAnswerForm'
import { PracticeDictationMode } from './PracticeDictationMode'
import { PracticeWordToMeaningMode } from './PracticeWordToMeaningMode'
import { PracticePronunciationMode } from './PracticePronunciationMode'

type InteractivePracticeStep = Exclude<PracticeStep, 'recap'>

type PracticeModeSurfaceProps = {
  mode: InteractivePracticeStep
  item: PracticeSessionItem
  typedAnswer: string
  selectedSlotId: string | null
  feedback: 'correct' | 'wrong' | null
  isResolved: boolean
  isBusy: boolean
  pronunciationFeedback: PronunciationAssessment | null
  recordingSupported: boolean
  isRecording: boolean
  pronunciationError: string | null
  onPlayAudio: () => void
  onAnswerChange: (value: string) => void
  onSubmit: () => void
  onSelectSlot: (slotId: string) => void
  onSkip: () => void
  onContinue: () => void
  onStartRecording: () => void
  onStopRecording: () => void
}

const prompts: Record<InteractivePracticeStep, string> = {
  dictation: 'Listen to the audio, type the word, then press Enter.',
  wordToMeaning: 'Read the word and context, then click the correct meaning.',
  pronunciation: 'Listen to the word, then record your pronunciation.',
}

export function PracticeModeSurface({ mode, item, typedAnswer, selectedSlotId, feedback, isResolved, isBusy, pronunciationFeedback, recordingSupported, isRecording, pronunciationError, onPlayAudio, onAnswerChange, onSubmit, onSelectSlot, onSkip, onContinue, onStartRecording, onStopRecording }: PracticeModeSurfaceProps) {
  const feedbackTitle = mode === 'pronunciation' ? 'Pronunciation needs another try' : 'Not quite'
  const feedbackDescription = mode === 'dictation'
    ? 'Try again or skip this word.'
    : mode === 'wordToMeaning'
      ? 'Choose another answer or skip this word.'
      : 'Record again or skip this word.'

  return (
    <div className={`practice-exercise practice-exercise--${mode}${feedback ? ` practice-exercise--${feedback}` : ''}`}>
      <h2 className="practice-exercise__prompt">{prompts[mode]}</h2>

      <div className={`practice-exercise__body practice-exercise__body--${mode}${feedback ? ' practice-exercise__body--feedback' : ''}`}>
        {mode === 'dictation' ? <PracticeDictationMode onPlayAudio={onPlayAudio} /> : null}
        {mode === 'dictation' ? (
          <PracticeAnswerForm
            typedAnswer={typedAnswer}
            isResolved={isResolved}
            isBusy={isBusy}
            onAnswerChange={onAnswerChange}
            onSubmit={onSubmit}
          />
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
            error={pronunciationError}
            onPlayAudio={onPlayAudio}
            onStartRecording={onStartRecording}
            onStopRecording={onStopRecording}
          />
        ) : null}
      </div>

      {feedback ? (
        <div className={`practice-exercise__feedback practice-exercise__feedback--${feedback}`} role="status" aria-live="polite">
          <strong>{feedback === 'correct' ? '✓  Correct' : `×  ${feedbackTitle}`}</strong>
          <span>{feedback === 'correct' ? 'Nice work. Press Enter or continue below.' : isResolved ? 'Press Enter or continue below.' : feedbackDescription}</span>
        </div>
      ) : null}

      <div className={`practice-exercise__actions${isResolved ? ' practice-exercise__actions--resolved' : ''}`}>
        {mode === 'dictation' && !isResolved ? <button className="learning-touch-submit" type="button" onClick={onSubmit} disabled={isBusy || !typedAnswer.trim()}>Check answer</button> : null}
        {!isResolved ? (
          <button type="button" onClick={onSkip} disabled={isBusy || isRecording}>Skip</button>
        ) : (
          <button type="button" onClick={onContinue} disabled={isBusy}>Continue</button>
        )}
      </div>
    </div>
  )
}
