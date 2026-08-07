import { useState } from 'react'
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
import { supportedLanguageProfiles } from '@/shared/lib/language'
import { SelectMenu } from '@/shared/components/ui/select-menu'

type CreateDialogProps = {
  pending?: boolean
  error?: string | null
  onOpenChange: (open: boolean) => void
}

type CreateBoardDialogProps = CreateDialogProps & {
  onConfirm: (name: string, language: string) => void
}

type CreatePageDialogProps = CreateDialogProps & {
  boardName: string
  onConfirm: (name: string) => void
}

export function CreateBoardDialog({ pending = false, error, onOpenChange, onConfirm }: CreateBoardDialogProps) {
  const [name, setName] = useState('')
  const [language, setLanguage] = useState('en')
  const trimmedName = name.trim()

  return (
    <Dialog open onOpenChange={(open) => { if (!pending) onOpenChange(open) }}>
      <DialogContent>
        <form
          className="grid gap-5"
          onSubmit={(event) => {
            event.preventDefault()
            if (trimmedName && !pending) onConfirm(trimmedName, language)
          }}
        >
          <div className="grid gap-2">
            <DialogTitle>Create board</DialogTitle>
            <DialogDescription>Create a collection for related vocabulary pages.</DialogDescription>
          </div>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <label className="text-sm font-medium" htmlFor="new-board-name">Board name</label>
              <Input
                id="new-board-name"
                data-testid="board-name-input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={120}
                autoFocus
                required
              />
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-medium" htmlFor="new-board-language">Language</label>
              <SelectMenu
                id="new-board-language"
                testId="board-language-select"
                buttonClassName="h-10 rounded-md border-input bg-card px-3 text-sm"
                value={language}
                onChange={setLanguage}
                aria-label="Language"
                options={supportedLanguageProfiles.map((profile) => ({ value: profile.code, label: profile.name }))}
              />
            </div>
            {error ? <p className="m-0 text-sm text-destructive">{error}</p> : null}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" size="sm" variant="outline" disabled={pending}>Cancel</Button></DialogClose>
            <Button data-testid="create-board-button" type="submit" size="sm" disabled={pending || !trimmedName}>
              {pending ? 'Creating...' : 'Create board'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function CreatePageDialog({ boardName, pending = false, error, onOpenChange, onConfirm }: CreatePageDialogProps) {
  const [name, setName] = useState('')
  const trimmedName = name.trim()

  return (
    <Dialog open onOpenChange={(open) => { if (!pending) onOpenChange(open) }}>
      <DialogContent>
        <form
          className="grid gap-5"
          onSubmit={(event) => {
            event.preventDefault()
            if (trimmedName && !pending) onConfirm(trimmedName)
          }}
        >
          <div className="grid gap-2">
            <DialogTitle>Create page</DialogTitle>
            <DialogDescription>{`Add a vocabulary page to “${boardName}”.`}</DialogDescription>
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-medium" htmlFor="new-page-name">Page name</label>
            <Input
              id="new-page-name"
              data-testid="page-name-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={120}
              autoFocus
              required
            />
            {error ? <p className="m-0 text-sm text-destructive">{error}</p> : null}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" size="sm" variant="outline" disabled={pending}>Cancel</Button></DialogClose>
            <Button data-testid="create-page-button" type="submit" size="sm" disabled={pending || !trimmedName}>
              {pending ? 'Creating...' : 'Create page'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
