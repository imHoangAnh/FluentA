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

type RenameEntityDialogProps = {
  entity: 'Board' | 'Page'
  initialName: string
  maxLength: number
  fallbackRef?: RefObject<HTMLElement | null>
  pending?: boolean
  returnFocusRef?: RefObject<HTMLElement | null>
  error?: string | null
  onOpenChange: (open: boolean) => void
  onConfirm: (name: string) => void
}

export function RenameEntityDialog({ entity, initialName, maxLength, fallbackRef, pending = false, returnFocusRef, error, onOpenChange, onConfirm }: RenameEntityDialogProps) {
  const [name, setName] = useState(initialName)
  const trimmedName = name.trim()

  return (
    <Dialog open onOpenChange={(open) => { if (!pending) onOpenChange(open) }}>
      <DialogContent
        onCloseAutoFocus={returnFocusRef || fallbackRef ? (event) => {
          event.preventDefault()
          requestAnimationFrame(() => {
            const returnTarget = returnFocusRef?.current
            if (returnTarget?.isConnected) returnTarget.focus()
            else fallbackRef?.current?.focus()
          })
        } : undefined}
      >
        <form
          className="grid gap-5"
          onSubmit={(event) => {
            event.preventDefault()
            if (trimmedName && trimmedName !== initialName) onConfirm(trimmedName)
          }}
        >
          <div className="grid gap-2">
            <DialogTitle>{`Rename ${entity}`}</DialogTitle>
            <DialogDescription>{`Enter a new name for “${initialName}”.`}</DialogDescription>
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-medium" htmlFor="rename-entity-name">{`${entity} name`}</label>
            <Input
              id="rename-entity-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={maxLength}
              autoFocus
              required
            />
            {error ? <p className="m-0 text-sm text-destructive">{error}</p> : null}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" size="sm" variant="outline" disabled={pending}>Cancel</Button></DialogClose>
            <Button type="submit" size="sm" disabled={pending || !trimmedName || trimmedName === initialName}>
              {pending ? 'Renaming...' : 'Rename'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
