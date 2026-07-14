import {
  AlertDialog,
  AlertDialogActionButton,
  AlertDialogCancelButton,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog'

type DeleteNoteConfirmationDialogProps = {
  entity: 'Board' | 'Page'
  name: string
  pending?: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function DeleteNoteConfirmationDialog({ entity, name, pending = false, onOpenChange, onConfirm }: DeleteNoteConfirmationDialogProps) {
  return (
    <AlertDialog open onOpenChange={(open) => { if (!pending) onOpenChange(open) }}>
      <AlertDialogContent>
        <AlertDialogTitle>{`Delete ${entity}?`}</AlertDialogTitle>
        <AlertDialogDescription>
          {entity === 'Board'
            ? `Delete “${name}”? This permanently removes the board and every note page inside it.`
            : `Delete “${name}”? This permanently removes this note page.`}
        </AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancelButton disabled={pending}>Cancel</AlertDialogCancelButton>
          <AlertDialogActionButton disabled={pending} onClick={(event) => { event.preventDefault(); onConfirm() }}>
            {pending ? 'Deleting...' : 'Delete'}
          </AlertDialogActionButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
