import { Mic, Square, TriangleAlert, Volume2 } from 'lucide-react'
import { PronunciationFeedback, type PronunciationAssessment } from '@/features/pronunciation'
import type { FlashcardCard } from '@/features/flashcards'
import { formatIpa, hasText } from './practiceFormatters'

type PracticePronunciationModeProps = {
  card: FlashcardCard
  assessment: PronunciationAssessment | null
  recordingSupported: boolean
  isRecording: boolean
  isAssessmentPending: boolean
  error: string | null
  onPlayAudio: () => void
  onStartRecording: () => void
  onStopRecording: () => void
}

export function PracticePronunciationMode({ card, assessment, recordingSupported, isRecording, isAssessmentPending, error, onPlayAudio, onStartRecording, onStopRecording }: PracticePronunciationModeProps) {
  return (
    <div className="review-exercise__stage review-pronunciation-stage">
      <div className="review-pronunciation-target">
        <strong>{card.word}</strong>
        {hasText(card.ipaPronunciation) ? <span>{formatIpa(card.ipaPronunciation)}</span> : null}
      </div>
      <PronunciationFeedback assessment={assessment} />
      {!recordingSupported ? <p className="practice-mode-warning"><TriangleAlert size={16} /> Microphone recording is unavailable in this browser.</p> : null}
      <div className="review-pronunciation-controls">
        <button className="review-pronunciation-play-button" type="button" aria-label="Play pronunciation" aria-keyshortcuts="Tab" title="Play audio (Tab)" onClick={onPlayAudio}>
          <Volume2 size={20} />
        </button>
        <button className={`review-record-button ${isRecording ? 'review-record-button--active' : ''}`} type="button" aria-label="Start recording" aria-keyshortcuts="R" title="Record (R)" onClick={onStartRecording} disabled={isRecording || isAssessmentPending || !recordingSupported}>
          <Mic size={22} />
        </button>
        <button className="review-stop-button" type="button" aria-label="Stop recording" aria-keyshortcuts="Space" title="Stop (Space)" onClick={onStopRecording} disabled={!isRecording}>
          <Square size={18} fill="currentColor" />
        </button>
      </div>
      {error ? <p className="flashcard-status flashcard-status--error">{error}</p> : null}
    </div>
  )
}
