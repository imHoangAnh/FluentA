import {
  AlertDialog,
  AlertDialogActionButton,
  AlertDialogCancelButton,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog'

type DeleteKanbanBoardConfirmationDialogProps = {
  name: string
  pending: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function DeleteKanbanBoardConfirmationDialog({
  name,
  pending,
  onOpenChange,
  onConfirm,
}: DeleteKanbanBoardConfirmationDialogProps) {
  return (
    <AlertDialog open onOpenChange={(open) => { if (!pending) onOpenChange(open) }}>
      <AlertDialogContent className="max-w-sm gap-3 p-5">
        <AlertDialogTitle className="text-base">Delete project?</AlertDialogTitle>
        <AlertDialogDescription className="break-words leading-5">
          Delete “{name}”? Its columns and cards will also be deleted. This action cannot be undone.
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
            {pending ? 'Deleting...' : 'Delete project'}
          </AlertDialogActionButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
