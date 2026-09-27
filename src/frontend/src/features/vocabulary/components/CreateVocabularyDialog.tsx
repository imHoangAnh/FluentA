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
import { OPTIONAL_VOCAB_COLUMNS } from '../api/vocabulary.api'

type CreateDialogProps = {
  pending?: boolean
  error?: string | null
  onOpenChange: (open: boolean) => void
}

type BoardDialogProps = CreateDialogProps & {
  mode: 'create' | 'update'
  initialName: string
  initialLanguage: string
  initialIncludedOptionalColumns: string[]
  onConfirm: (name: string, language: string, includedOptionalColumns: string[]) => void
}

type CreateBoardDialogProps = CreateDialogProps & {
  onConfirm: (name: string, language: string, includedOptionalColumns: string[]) => void
}

type UpdateBoardDialogProps = CreateDialogProps & {
  initialName: string
  initialLanguage: string
  initialIncludedOptionalColumns: string[]
  onConfirm: (name: string, language: string, includedOptionalColumns: string[]) => void
}

type CreatePageDialogProps = CreateDialogProps & {
  boardName: string
  onConfirm: (name: string) => void
}

const coreColumns = ['Word', 'Meaning', 'IPA', 'Class', 'Example'] as const

export function CreateBoardDialog(props: CreateBoardDialogProps) {
  return (
    <BoardDialog
      {...props}
      mode="create"
      initialName=""
      initialLanguage="en"
      initialIncludedOptionalColumns={[]}
    />
  )
}

export function UpdateBoardDialog(props: UpdateBoardDialogProps) {
  return <BoardDialog {...props} mode="update" />
}

function BoardDialog({
  pending = false,
  error,
  onOpenChange,
  onConfirm,
  mode,
  initialName,
  initialLanguage,
  initialIncludedOptionalColumns,
}: BoardDialogProps) {
  const [name, setName] = useState(initialName)
  const [language, setLanguage] = useState(initialLanguage)
  const [selectedOptionalColumns, setSelectedOptionalColumns] = useState<string[]>(initialIncludedOptionalColumns)
  const trimmedName = name.trim()
  const includedOptionalColumns = OPTIONAL_VOCAB_COLUMNS
    .filter(({ key }) => selectedOptionalColumns.includes(key))
    .map(({ key }) => key)
  const title = mode === 'create' ? 'Create board' : 'Update board'
  const nameId = mode === 'create' ? 'new-board-name' : 'update-board-name'
  const nameTestId = mode === 'create' ? 'board-name-input' : 'update-board-name-input'
  const languageId = mode === 'create' ? 'new-board-language' : 'update-board-language'

  return (
    <Dialog open onOpenChange={(open) => { if (!pending) onOpenChange(open) }}>
      <DialogContent>
        <form
          className="grid gap-5"
          onSubmit={(event) => {
            event.preventDefault()
            if (trimmedName && !pending) onConfirm(trimmedName, language, includedOptionalColumns)
          }}
        >
          <div className="grid gap-2">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{mode === 'create' ? 'Create a collection for related vocabulary pages.' : 'Update this board’s name, language, and vocabulary columns.'}</DialogDescription>
          </div>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <label className="text-sm font-medium" htmlFor={nameId}>Board name</label>
              <Input
                id={nameId}
                data-testid={nameTestId}
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={120}
                autoFocus
                required
              />
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-medium" htmlFor={languageId}>Language</label>
              <SelectMenu
                id={languageId}
                testId="board-language-select"
                buttonClassName="h-10 rounded-md border-input bg-card px-3 text-sm"
                value={language}
                onChange={setLanguage}
                aria-label="Language"
                options={supportedLanguageProfiles.map((profile) => ({ value: profile.code, label: profile.name }))}
              />
            </div>
            <fieldset className="grid gap-2 border-0 p-0">
              <legend className="mb-1 text-sm font-medium">Vocabulary columns</legend>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {coreColumns.map((column) => (
                  <label className="flex items-center gap-2 text-sm" key={column}>
                    <input className="size-4 accent-primary" type="checkbox" checked disabled readOnly />
                    <span>{column}</span>
                  </label>
                ))}
                {OPTIONAL_VOCAB_COLUMNS.map(({ key, label }) => (
                  <label className="flex items-center gap-2 text-sm" key={key}>
                    <input
                      className="size-4 accent-primary"
                      type="checkbox"
                      checked={selectedOptionalColumns.includes(key)}
                      onChange={(event) => {
                        setSelectedOptionalColumns((current) => event.target.checked
                          ? [...current, key]
                          : current.filter((selectedKey) => selectedKey !== key))
                      }}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            {error ? <p className="m-0 text-sm text-destructive">{error}</p> : null}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" size="sm" variant="outline" disabled={pending}>Cancel</Button></DialogClose>
            <Button data-testid={`${mode}-board-button`} type="submit" size="sm" disabled={pending || !trimmedName}>
              {pending ? 'Saving...' : title}
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
