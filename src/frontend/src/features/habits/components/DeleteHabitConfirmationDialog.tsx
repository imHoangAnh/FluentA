import {
  AlertDialog,
  AlertDialogActionButton,
  AlertDialogCancelButton,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog'

type DeleteHabitConfirmationDialogProps = {
  name: string
  pending: boolean
  error?: string
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function DeleteHabitConfirmationDialog({
  name,
  pending,
  error,
  onOpenChange,
  onConfirm,
}: DeleteHabitConfirmationDialogProps) {
  return (
    <AlertDialog open onOpenChange={(open) => { if (!pending) onOpenChange(open) }}>
      <AlertDialogContent className="max-w-sm gap-3 p-5">
        <AlertDialogTitle className="text-base">Delete Habit?</AlertDialogTitle>
        <AlertDialogDescription className="break-words leading-5">
          Delete “{name}”? This removes the Habit and its check-in history from your tracker. This action cannot be undone.
        </AlertDialogDescription>
        {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
        <AlertDialogFooter>
          <AlertDialogCancelButton disabled={pending}>Cancel</AlertDialogCancelButton>
          <AlertDialogActionButton
            disabled={pending}
            onClick={(event) => {
              event.preventDefault()
              onConfirm()
            }}
          >
            {pending ? 'Deleting...' : 'Delete Habit'}
          </AlertDialogActionButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
