import type { RefObject } from 'react'
import {
  AlertDialog,
  AlertDialogActionButton,
  AlertDialogCancelButton,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

type DeleteEntity = 'Board' | 'Page' | 'Word'

type DeleteConfirmationDialogProps = {
  entity: DeleteEntity
  name: string
  open: boolean
  pending?: boolean
  restoreFallback?: boolean
  fallbackRef: RefObject<HTMLElement | null>
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function DeleteConfirmationDialog({ entity, name, open, pending = false, restoreFallback = false, fallbackRef, onOpenChange, onConfirm }: DeleteConfirmationDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        onCloseAutoFocus={(event) => {
          if (!restoreFallback) return
          event.preventDefault()
          requestAnimationFrame(() => fallbackRef.current?.focus())
        }}
      >
        <AlertDialogTitle>{`Delete ${entity}?`}</AlertDialogTitle>
        <AlertDialogDescription>
          {`Delete “${name}”? This permanently removes its related vocabulary and learning data.`}
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
