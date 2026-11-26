import { Volume2 } from 'lucide-react'

const leftBars = [12, 22, 30, 18]
const rightBars = [18, 30, 22, 12]

type PracticeDictationModeProps = {
  onPlayAudio: () => void
}

export function PracticeDictationMode({ onPlayAudio }: PracticeDictationModeProps) {
  return (
    <div className="practice-dictation-stage">
      <div className="practice-wave-cluster">
        <div className="practice-wave-bars" aria-hidden="true">
          {leftBars.map((height, index) => (
            <span key={`left-${index}`} className="practice-wave-bar" style={{ height: `${height}px` }} />
          ))}
        </div>

        <button
          className="practice-audio-disc"
          type="button"
          aria-label="Play word"
          aria-keyshortcuts="Tab"
          onClick={onPlayAudio}
        >
          <Volume2 aria-hidden="true" size={30} />
        </button>

        <div className="practice-wave-bars" aria-hidden="true">
          {rightBars.map((height, index) => (
            <span key={`right-${index}`} className="practice-wave-bar" style={{ height: `${height}px` }} />
          ))}
        </div>
      </div>

      <div className="practice-audio-meta">
        <strong>Play word</strong>
        <p>Listen again whenever you need.</p>
      </div>
    </div>
  )
}
