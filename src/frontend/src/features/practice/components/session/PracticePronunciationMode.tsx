import { Mic, Play, Square, TriangleAlert, Volume2 } from 'lucide-react'
import { PronunciationFeedback, type PronunciationAssessment } from '@/features/pronunciation'
import type { PracticeSessionItem } from '../../api/practice.api'
import { formatIpa, formatWordType, hasText } from './practiceFormatters'

const leftBars = [10, 20, 28, 16, 24]
const rightBars = [24, 16, 28, 20, 10]

type PracticePronunciationModeProps = {
  item: PracticeSessionItem
  assessment: PronunciationAssessment | null
  recordingSupported: boolean
  isRecording: boolean
  isAssessmentPending: boolean
  isResolved: boolean
  hasRecordedAudio: boolean
  error: string | null
  onPlayAudio: () => void
  onPlayMyVoice: () => void
  onStartRecording: () => void
  onStopRecording: () => void
  onRetry: () => void
}

export function PracticePronunciationMode({
  item,
  assessment,
  recordingSupported,
  isRecording,
  isAssessmentPending,
  isResolved,
  hasRecordedAudio,
  error,
  onPlayAudio,
  onPlayMyVoice,
  onStartRecording,
  onStopRecording,
  onRetry,
}: PracticePronunciationModeProps) {
  const wordType = hasText(item.type) ? formatWordType(item.type) : ''
  const ipa = hasText(item.ipaPronunciation) ? formatIpa(item.ipaPronunciation) : ''
  const hasAssessment = Boolean(assessment && assessment.words.length > 0)
  const captionText = isRecording
    ? 'Listening... Tap or press Space to stop'
    : isAssessmentPending
      ? 'Checking your pronunciation...'
      : assessment
        ? 'Tap mic to record again'
        : 'Tap mic to record'

  return (
    <div className="practice-pronunciation">
      <div className="practice-pronunciation-hero">
        <div className="practice-pronunciation-hero__left">
          <strong>{item.word}</strong>
          {wordType ? <span className="practice-pos-badge">{wordType}</span> : null}
          {ipa ? <span className="practice-ipa">{ipa}</span> : null}
        </div>

        <div className="practice-audio-pills">
          <button
            className="practice-pill-btn practice-pill-btn--listen"
            type="button"
            aria-label="Listen to pronunciation"
            aria-keyshortcuts="Tab"
            onClick={onPlayAudio}
          >
            <Volume2 aria-hidden="true" size={15} />
            <span>Listen</span>
          </button>

          <button
            className="practice-pill-btn practice-pill-btn--voice"
            type="button"
            aria-label="Play my voice"
            aria-keyshortcuts="P"
            disabled={!hasRecordedAudio || isRecording}
            onClick={onPlayMyVoice}
          >
            <span className="practice-play-badge" aria-hidden="true">
              <Play size={10} fill="currentColor" />
            </span>
            <span>My Voice</span>
          </button>
        </div>
      </div>

      <div className="practice-pronunciation-stage">
        <div className="practice-mic-hero">
          <div className={`practice-wave-cluster${isRecording ? ' practice-wave-cluster--active' : ''}`}>
            <div className="practice-wave-bars" aria-hidden="true">
              {leftBars.map((height, index) => (
                <span key={`left-${index}`} className="practice-wave-bar" style={{ height: `${height}px` }} />
              ))}
            </div>

            <div className={`practice-mic-halo${isRecording ? ' practice-mic-halo--recording' : ''}`}>
              {isRecording ? (
                <button
                  className="practice-mic-btn practice-mic-btn--recording"
                  type="button"
                  aria-label="Stop recording and check"
                  aria-keyshortcuts="Space"
                  onClick={onStopRecording}
                  disabled={isAssessmentPending}
                >
                  <Square size={18} fill="currentColor" aria-hidden="true" />
                </button>
              ) : (
                <button
                  className="practice-mic-btn"
                  type="button"
                  aria-label={assessment ? 'Record again' : 'Start recording'}
                  aria-keyshortcuts="R"
                  onClick={isResolved ? onRetry : onStartRecording}
                  disabled={!recordingSupported || isAssessmentPending}
                >
                  <Mic size={24} aria-hidden="true" />
                </button>
              )}
            </div>

            <div className="practice-wave-bars" aria-hidden="true">
              {rightBars.map((height, index) => (
                <span key={`right-${index}`} className="practice-wave-bar" style={{ height: `${height}px` }} />
              ))}
            </div>
          </div>

          <p className="practice-mic-caption">{captionText}</p>
        </div>

        {hasAssessment ? (
          <>
            <div className="practice-stage-divider" aria-hidden="true" />
            <div className="practice-syllable-result">
              <PronunciationFeedback assessment={assessment} />
            </div>
          </>
        ) : null}
      </div>

      {!recordingSupported ? (
        <p className="practice-pronunciation__warning">
          <TriangleAlert size={16} aria-hidden="true" />
          Microphone recording is unavailable in this browser.
        </p>
      ) : null}
      {error ? <p className="practice-pronunciation__error" role="alert">{error}</p> : null}
    </div>
  )
}
