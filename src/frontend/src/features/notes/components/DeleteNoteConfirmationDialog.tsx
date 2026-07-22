import type { RefObject } from 'react'
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
  fallbackRef: RefObject<HTMLElement | null>
  name: string
  pending?: boolean
  restoreFallback?: boolean
  returnFocusRef: RefObject<HTMLElement | null>
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function DeleteNoteConfirmationDialog({ entity, fallbackRef, name, pending = false, restoreFallback = false, returnFocusRef, onOpenChange, onConfirm }: DeleteNoteConfirmationDialogProps) {
  return (
    <AlertDialog open onOpenChange={(open) => { if (!pending) onOpenChange(open) }}>
      <AlertDialogContent
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          requestAnimationFrame(() => {
            const returnTarget = returnFocusRef.current
            if (!restoreFallback && returnTarget?.isConnected) returnTarget.focus()
            else fallbackRef.current?.focus()
          })
        }}
      >
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
