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

type CreateBoardDialogProps = CreateDialogProps & {
  onConfirm: (name: string, language: string, includedOptionalColumns: string[]) => void
}

type BoardSettingsDialogProps = CreateDialogProps & {
  boardName: string
  initialLanguage: string
  initialIncludedOptionalColumns: string[]
  onConfirm: (language: string, includedOptionalColumns: string[]) => void
}

type CreatePageDialogProps = CreateDialogProps & {
  boardName: string
  onConfirm: (name: string) => void
}

const coreColumns = ['Word', 'Meaning', 'IPA', 'Type', 'Example'] as const

function sortIncludedOptionalColumns(selectedKeys: string[]) {
  return OPTIONAL_VOCAB_COLUMNS
    .filter(({ key }) => selectedKeys.includes(key))
    .map(({ key }) => key)
}

function VocabularyColumnsFieldset({
  selectedOptionalColumns,
  onToggleOptionalColumn,
}: {
  selectedOptionalColumns: string[]
  onToggleOptionalColumn: (key: string, checked: boolean) => void
}) {
  return (
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
              onChange={(event) => onToggleOptionalColumn(key, event.target.checked)}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export function CreateBoardDialog({
  pending = false,
  error,
  onOpenChange,
  onConfirm,
}: CreateBoardDialogProps) {
  const [name, setName] = useState('')
  const [language, setLanguage] = useState('en')
  const [selectedOptionalColumns, setSelectedOptionalColumns] = useState<string[]>([])
  const trimmedName = name.trim()
  const includedOptionalColumns = sortIncludedOptionalColumns(selectedOptionalColumns)

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
            <VocabularyColumnsFieldset
              selectedOptionalColumns={selectedOptionalColumns}
              onToggleOptionalColumn={(key, checked) => {
                setSelectedOptionalColumns((current) => checked
                  ? [...current, key]
                  : current.filter((selectedKey) => selectedKey !== key))
              }}
            />
            {error ? <p className="m-0 text-sm text-destructive">{error}</p> : null}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" size="sm" variant="outline" disabled={pending}>Cancel</Button></DialogClose>
            <Button data-testid="create-board-button" type="submit" size="sm" disabled={pending || !trimmedName}>
              {pending ? 'Saving...' : 'Create board'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function BoardSettingsDialog({
  boardName,
  initialLanguage,
  initialIncludedOptionalColumns,
  pending = false,
  error,
  onOpenChange,
  onConfirm,
}: BoardSettingsDialogProps) {
  const [language, setLanguage] = useState(initialLanguage)
  const [selectedOptionalColumns, setSelectedOptionalColumns] = useState<string[]>(initialIncludedOptionalColumns)
  const includedOptionalColumns = sortIncludedOptionalColumns(selectedOptionalColumns)

  return (
    <Dialog open onOpenChange={(open) => { if (!pending) onOpenChange(open) }}>
      <DialogContent>
        <form
          className="grid gap-5"
          onSubmit={(event) => {
            event.preventDefault()
            if (!pending) onConfirm(language, includedOptionalColumns)
          }}
        >
          <div className="grid gap-2">
            <DialogTitle>Board settings</DialogTitle>
            <DialogDescription>{`Choose which columns are shown in “${boardName}”.`}</DialogDescription>
          </div>
          <div className="grid gap-4">
            <VocabularyColumnsFieldset
              selectedOptionalColumns={selectedOptionalColumns}
              onToggleOptionalColumn={(key, checked) => {
                setSelectedOptionalColumns((current) => checked
                  ? [...current, key]
                  : current.filter((selectedKey) => selectedKey !== key))
              }}
            />
            <div className="grid gap-1.5">
              <label className="text-sm font-medium" htmlFor="board-settings-language">Language</label>
              <SelectMenu
                id="board-settings-language"
                testId="board-language-select"
                buttonClassName="h-9 rounded-md border-input bg-card px-3 text-sm"
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
            <Button data-testid="save-board-settings-button" type="submit" size="sm" disabled={pending}>
              {pending ? 'Saving...' : 'Save settings'}
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
