import {
  AlertDialog,
  AlertDialogActionButton,
  AlertDialogCancelButton,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog'

type RemoveLevelFiveWordsDialogProps = {
  count: number
  error: string | null
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
  onRestoreFocus: () => void
  open: boolean
  pending: boolean
}

export function RemoveLevelFiveWordsDialog({
  count,
  error,
  onConfirm,
  onOpenChange,
  onRestoreFocus,
  open,
  pending,
}: RemoveLevelFiveWordsDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => { if (!pending) onOpenChange(nextOpen) }}>
      <AlertDialogContent
        className="max-w-sm gap-3 p-5"
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          onRestoreFocus()
        }}
      >
        <AlertDialogTitle className="text-base">Remove selected words?</AlertDialogTitle>
        <AlertDialogDescription className="leading-5">
          {`${count} ${count === 1 ? 'word' : 'words'} will become inactive. Review history will be preserved.`}
        </AlertDialogDescription>
        {error ? <p className="m-0 text-sm text-destructive" role="alert">{error}</p> : null}
        <AlertDialogFooter className="flex-wrap">
          <AlertDialogCancelButton disabled={pending}>Cancel</AlertDialogCancelButton>
          <AlertDialogActionButton
            disabled={pending}
            onClick={(event) => {
              event.preventDefault()
              onConfirm()
            }}
          >
            {pending ? 'Removing...' : 'Confirm remove'}
          </AlertDialogActionButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
