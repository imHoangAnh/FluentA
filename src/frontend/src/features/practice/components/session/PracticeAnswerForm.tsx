type PracticeAnswerFormProps = {
  typedAnswer: string
  isResolved: boolean
  isBusy: boolean
  onAnswerChange: (value: string) => void
  onSubmit: () => void
}

export function PracticeAnswerForm({ typedAnswer, isResolved, isBusy, onAnswerChange, onSubmit }: PracticeAnswerFormProps) {
  return (
    <input
      className="practice-dictation-input"
      id="practice-answer-input"
      value={typedAnswer}
      onChange={(event) => onAnswerChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && typedAnswer.trim().length > 0) {
          event.preventDefault()
          event.stopPropagation()
          onSubmit()
        }
      }}
      data-testid="practice-answer-input"
      placeholder="Type the word you hear..."
      disabled={isResolved || isBusy}
      autoComplete="off"
      autoCapitalize="off"
      spellCheck={false}
      aria-label="Type the word you hear"
    />
  )
}
