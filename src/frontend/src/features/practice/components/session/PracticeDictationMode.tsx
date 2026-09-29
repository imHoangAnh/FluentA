import { Volume2 } from 'lucide-react'

type PracticeDictationModeProps = {
  onPlayAudio: () => void
}

export function PracticeDictationMode({ onPlayAudio }: PracticeDictationModeProps) {
  return (
    <div className="practice-dictation-audio">
      <button className="practice-dictation-audio__play" type="button" aria-label="Play word" aria-keyshortcuts="Tab" onClick={onPlayAudio}>
        <Volume2 aria-hidden="true" size={32} className="practice-dictation-audio__icon" />
      </button>
      <span>Play word</span>
      <p>Listen again whenever you need.</p>
    </div>
  )
}
