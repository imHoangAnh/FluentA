import { useState } from 'react'
import type { RefObject } from 'react'
import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'

type CreateNoteDialogProps = {
  boardName?: string
  entity: 'Board' | 'Page'
  error?: string | null
  fallbackRef: RefObject<HTMLElement | null>
  pending?: boolean
  returnFocusRef: RefObject<HTMLElement | null>
  onConfirm: (name: string) => void
  onOpenChange: (open: boolean) => void
}

export function CreateNoteDialog({
  boardName,
  entity,
  error,
  fallbackRef,
  pending = false,
  returnFocusRef,
  onConfirm,
  onOpenChange,
}: CreateNoteDialogProps) {
  const [name, setName] = useState('')
  const trimmedName = name.trim()
  const isBoard = entity === 'Board'
  const inputId = `new-note-${entity.toLowerCase()}-name`

  return (
    <Dialog open onOpenChange={(open) => { if (!pending) onOpenChange(open) }}>
      <DialogContent
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          requestAnimationFrame(() => {
            const returnTarget = returnFocusRef.current
            if (returnTarget?.isConnected) returnTarget.focus()
            else fallbackRef.current?.focus()
          })
        }}
      >
        <form
          className="grid gap-5"
          onSubmit={(event) => {
            event.preventDefault()
            if (trimmedName && !pending) onConfirm(trimmedName)
          }}
        >
          <div className="grid gap-2">
            <DialogTitle>{`Create ${entity.toLowerCase()}`}</DialogTitle>
            <DialogDescription>
              {isBoard
                ? 'Create a collection for related note pages.'
                : `Add a note page to “${boardName ?? 'this board'}”.`}
            </DialogDescription>
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-medium" htmlFor={inputId}>{`${entity} name`}</label>
            <Input
              id={inputId}
              value={name}
              maxLength={isBoard ? 120 : 240}
              autoFocus
              required
              onChange={(event) => setName(event.target.value)}
            />
            {error ? <p className="m-0 text-sm text-destructive" role="alert">{error}</p> : null}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" size="sm" variant="outline" disabled={pending}>Cancel</Button>
            </DialogClose>
            <Button type="submit" size="sm" disabled={pending || !trimmedName}>
              {pending ? 'Creating...' : `Create ${entity.toLowerCase()}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
