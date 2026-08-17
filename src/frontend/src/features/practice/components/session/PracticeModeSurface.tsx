import type { FlashcardCard } from '@/features/flashcards'
import type { PronunciationAssessment } from '@/features/pronunciation'
import type { PracticeMode } from '../../api/practice.api'
import { PracticeAnswerForm } from './PracticeAnswerForm'
import { PracticeDictationMode } from './PracticeDictationMode'
import { PracticeMeaningToWordMode } from './PracticeMeaningToWordMode'
import { PracticePronunciationMode } from './PracticePronunciationMode'

type PracticeModeSurfaceProps = {
  mode: PracticeMode
  card: FlashcardCard
  typedAnswer: string
  feedback: 'correct' | 'wrong' | null
  isResolved: boolean
  usesLargeAnswerLayout: boolean
  pronunciationFeedback: PronunciationAssessment | null
  recordingSupported: boolean
  isRecording: boolean
  isAssessmentPending: boolean
  pronunciationError: string | null
  onPlayAudio: () => void
  onAnswerChange: (value: string) => void
  onSubmit: () => void
  onSkip: () => void
  onContinue: () => void
  onStartRecording: () => void
  onStopRecording: () => void
}

const prompts: Record<PracticeMode, string> = {
  dictation: 'Listen carefully, then type the word you hear',
  meaningToWord: 'What word matches this meaning?',
  pronunciation: 'Say the word naturally',
}

export function PracticeModeSurface({ mode, card, typedAnswer, feedback, isResolved, usesLargeAnswerLayout, pronunciationFeedback, recordingSupported, isRecording, isAssessmentPending, pronunciationError, onPlayAudio, onAnswerChange, onSubmit, onSkip, onContinue, onStartRecording, onStopRecording }: PracticeModeSurfaceProps) {
  return (
    <div className="review-exercise">
      <h2 className="review-exercise__prompt">{prompts[mode]}</h2>

      {mode === 'dictation' ? <PracticeDictationMode onPlayAudio={onPlayAudio} /> : null}
      {mode === 'meaningToWord' ? <PracticeMeaningToWordMode card={card} /> : null}
      {mode === 'pronunciation' ? <PracticePronunciationMode card={card} assessment={pronunciationFeedback} recordingSupported={recordingSupported} isRecording={isRecording} isAssessmentPending={isAssessmentPending} error={pronunciationError} onPlayAudio={onPlayAudio} onStartRecording={onStartRecording} onStopRecording={onStopRecording} /> : null}

      {mode !== 'pronunciation' ? <PracticeAnswerForm mode={mode} typedAnswer={typedAnswer} isResolved={isResolved} feedback={feedback} usesLargeAnswerLayout={usesLargeAnswerLayout} onAnswerChange={onAnswerChange} onSubmit={onSubmit} onSkip={onSkip} onContinue={onContinue} /> : (
        <div className="review-exercise__actions">
          {feedback === 'wrong' ? <p className="practice-wrong-message" role="status" aria-live="polite">Wrong</p> : null}
          {!isResolved ? <button className="practice-dictation-skip" type="button" onClick={onSkip}>Skip</button> : null}
          {isResolved ? <button className="practice-dictation-submit" type="button" onClick={onContinue}>Continue</button> : null}
        </div>
      )}
    </div>
  )
}
