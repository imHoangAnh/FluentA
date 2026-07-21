import {
  AlertDialog,
  AlertDialogActionButton,
  AlertDialogCancelButton,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog'

type DeleteTodoConfirmationDialogProps = {
  title: string
  pending: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function DeleteTodoConfirmationDialog({
  title,
  pending,
  onOpenChange,
  onConfirm,
}: DeleteTodoConfirmationDialogProps) {
  return (
    <AlertDialog open onOpenChange={(open) => { if (!pending) onOpenChange(open) }}>
      <AlertDialogContent className="max-w-sm gap-3 p-5">
        <AlertDialogTitle className="text-base">Delete task?</AlertDialogTitle>
        <AlertDialogDescription className="break-words leading-5">
          Delete “{title}”? This action cannot be undone.
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
            {pending ? 'Deleting...' : 'Delete task'}
          </AlertDialogActionButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
