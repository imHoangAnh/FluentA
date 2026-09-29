import { TriangleAlert, Volume2 } from 'lucide-react'
import { PronunciationFeedback, type PronunciationAssessment } from '@/features/pronunciation'
import type { PracticeSessionItem } from '../../api/practice.api'
import { formatIpa, formatWordType, hasText } from './practiceFormatters'

type PracticePronunciationModeProps = {
  item: PracticeSessionItem
  assessment: PronunciationAssessment | null
  recordingSupported: boolean
  isRecording: boolean
  isAssessmentPending: boolean
  isResolved: boolean
  error: string | null
  onPlayAudio: () => void
  onStartRecording: () => void
  onStopRecording: () => void
}

export function PracticePronunciationMode({ item, assessment, recordingSupported, isRecording, isAssessmentPending, isResolved, error, onPlayAudio, onStartRecording, onStopRecording }: PracticePronunciationModeProps) {
  const details = [hasText(item.type) ? formatWordType(item.type) : '', hasText(item.ipaPronunciation) ? formatIpa(item.ipaPronunciation) : '']
    .filter(Boolean)
    .join('  ·  ')

  return (
    <div className="practice-pronunciation">
      <div className="practice-pronunciation__word">
        <strong>{item.word}</strong>
        {details ? <span>{details}</span> : null}
      </div>

      <div className="practice-pronunciation__controls">
        <button className="practice-pronunciation__listen" type="button" aria-label="Listen to pronunciation" aria-keyshortcuts="Tab" onClick={onPlayAudio}>
          <span>Listen</span>
          <Volume2 aria-hidden="true" size={20} />
        </button>
        {isRecording ? (
          <button className="practice-pronunciation__record practice-pronunciation__record--active" type="button" aria-label="Stop recording and check" aria-keyshortcuts="Space" onClick={onStopRecording} disabled={isAssessmentPending}>
            Stop and check
          </button>
        ) : (
          <button className="practice-pronunciation__record" type="button" aria-label="Start recording" aria-keyshortcuts="R" onClick={onStartRecording} disabled={!recordingSupported || isAssessmentPending || isResolved}>
            Record
          </button>
        )}
      </div>

      <p className="practice-pronunciation__hint">Listen to the model, then record your pronunciation.</p>
      <PronunciationFeedback assessment={assessment} />
      {!recordingSupported ? <p className="practice-pronunciation__warning"><TriangleAlert size={16} /> Microphone recording is unavailable in this browser.</p> : null}
      {error ? <p className="practice-pronunciation__error" role="alert">{error}</p> : null}
    </div>
  )
}
