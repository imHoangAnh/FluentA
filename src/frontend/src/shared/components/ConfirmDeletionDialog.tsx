import { AlertDialog, AlertDialogActionButton, AlertDialogCancelButton, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from './ui/alert-dialog'

type Props = {
  name: string | null
  pending: boolean
  error?: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function ConfirmDeletionDialog({ name, pending, error, onCancel, onConfirm }: Props) {
  return (
    <AlertDialog open={name !== null} onOpenChange={(open) => { if (!open && !pending) onCancel() }}>
      <AlertDialogContent>
        <AlertDialogTitle>Confirm deletion</AlertDialogTitle>
        <AlertDialogDescription>Delete "{name}"? It will no longer appear in your workspace. You cannot restore it in the app.</AlertDialogDescription>
        {error ? <p role="alert" className="text-sm text-destructive">Could not delete this item. Try again.</p> : null}
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
