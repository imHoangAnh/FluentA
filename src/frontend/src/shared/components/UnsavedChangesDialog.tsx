import { AlertDialog, AlertDialogActionButton, AlertDialogCancelButton, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from './ui/alert-dialog'

export function UnsavedChangesDialog({ open, onStay, onDiscard }: { open: boolean; onStay: () => void; onDiscard: () => void }) {
  return <AlertDialog open={open} onOpenChange={value => { if (!value) onStay() }}>
    <AlertDialogContent>
      <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
      <AlertDialogDescription>Your latest changes have not been saved successfully. If you continue, these changes may be lost.</AlertDialogDescription>
      <AlertDialogFooter>
        <AlertDialogCancelButton onClick={onStay}>Stay</AlertDialogCancelButton>
        <AlertDialogActionButton onClick={onDiscard}>Discard and continue</AlertDialogActionButton>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
}
