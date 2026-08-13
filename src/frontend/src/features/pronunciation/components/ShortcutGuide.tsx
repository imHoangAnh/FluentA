export type ShortcutMode = 'dictation' | 'meaningToWord' | 'pronunciation' | 'recap'

const shortcuts: Record<ShortcutMode, Array<[string, string]>> = {
  dictation: [['Tab', 'Play audio'], ['Enter', 'Submit'], ['Esc', 'Skip']],
  meaningToWord: [['Enter', 'Submit'], ['Esc', 'Skip']],
  pronunciation: [['Tab', 'Play audio'], ['R', 'Record'], ['Space', 'Stop'], ['Esc', 'Skip']],
  recap: [['Enter', 'Continue']],
}

export function ShortcutGuide({ mode }: { mode: ShortcutMode }) {
  return (
    <p className="practice-session__shortcut" aria-label="Keyboard shortcuts">
      Shortcut:{' '}
      {shortcuts[mode].map(([key, label], index) => (
        <span key={key}>
          {index > 0 ? ' · ' : null}
          <kbd>[{key}]</kbd> {label}
        </span>
      ))}
    </p>
  )
}
