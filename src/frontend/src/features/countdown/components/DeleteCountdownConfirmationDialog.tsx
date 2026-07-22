import {
  AlertDialog,
  AlertDialogActionButton,
  AlertDialogCancelButton,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog'

type DeleteCountdownConfirmationDialogProps = {
  countdownName: string
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
  onRestoreFocus: () => void
  pending: boolean
}

export function DeleteCountdownConfirmationDialog({
  countdownName,
  onConfirm,
  onOpenChange,
  onRestoreFocus,
  pending,
}: DeleteCountdownConfirmationDialogProps) {
  return (
    <AlertDialog open onOpenChange={(open) => { if (!pending) onOpenChange(open) }}>
      <AlertDialogContent
        className="max-w-sm gap-3 p-5"
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          onRestoreFocus()
        }}
      >
        <AlertDialogTitle className="text-base">Delete countdown?</AlertDialogTitle>
        <AlertDialogDescription className="break-words leading-5">
          {`“${countdownName}” will be removed and its future alerts will be cancelled. This action cannot be undone.`}
        </AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancelButton disabled={pending}>Cancel</AlertDialogCancelButton>
          <AlertDialogActionButton
            disabled={pending}
            onClick={(event) => {
              event.preventDefault()
              onConfirm()
            }}
          >
            {pending ? 'Deleting...' : 'Delete countdown'}
          </AlertDialogActionButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
