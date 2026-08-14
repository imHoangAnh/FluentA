type PracticeCompletionProps = {
  isSaving: boolean
  onFinish: () => void
}

export function PracticeCompletion({ isSaving, onFinish }: PracticeCompletionProps) {
  return <button className="practice-recap__finish-button" type="button" onClick={onFinish} disabled={isSaving} data-testid="practice-next-card">Finish</button>
}
