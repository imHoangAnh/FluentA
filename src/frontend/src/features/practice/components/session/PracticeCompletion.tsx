import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'

type PracticeCompletionProps = {
  isSaving: boolean
  isCompleted?: boolean
  hasError?: boolean
  onFinish: () => void
}

export function PracticeCompletion({ isSaving, isCompleted = false, hasError = false, onFinish }: PracticeCompletionProps) {
  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardContent className="grid justify-items-center gap-4 p-8 text-center sm:p-12">
        <span className="grid size-14 place-items-center rounded-full bg-secondary text-primary" aria-hidden="true">✓</span>
        <div className="grid gap-2">
          <h1 className="m-0 text-2xl font-semibold tracking-[-0.02em] text-foreground">{isCompleted ? 'Practice complete' : 'All words covered'}</h1>
          <p className="m-0 text-sm leading-6 text-muted-foreground">
            {isCompleted ? 'This practice session has already been saved.' : 'Your answers are ready to save.'}
          </p>
        </div>
        {hasError ? <p className="m-0 text-sm text-destructive" role="alert">Unable to save this practice session. Try again.</p> : null}
        <Button type="button" disabled={isSaving} onClick={onFinish}>{isCompleted ? 'Back to decks' : isSaving ? 'Saving…' : 'Finish practice'}</Button>
      </CardContent>
    </Card>
  )
}
