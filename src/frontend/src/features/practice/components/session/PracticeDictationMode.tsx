import { Volume2 } from 'lucide-react'

type PracticeDictationModeProps = {
  onPlayAudio: () => void
}

export function PracticeDictationMode({ onPlayAudio }: PracticeDictationModeProps) {
  return (
    <div className="review-exercise__stage review-exercise__stage--dictation">
      <div className="practice-dictation-audio-control">
        <button className="review-audio-action" type="button" aria-label="Play pronunciation" aria-keyshortcuts="Tab" onClick={onPlayAudio}>
          <Volume2 size={28} />
        </button>
        <span>Play</span>
      </div>
    </div>
  )
}
