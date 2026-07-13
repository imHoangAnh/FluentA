import { Check, ChevronDown, Columns3 } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Button } from '@/components/ui/button'
import type { BoardPreferences } from '@/lib/api/vocabulary.api'

const optionalColumns = [
  { key: 'definition', name: 'Definition' },
  { key: 'note', name: 'Note' },
  { key: 'synonyms', name: 'Synonyms' },
  { key: 'antonyms', name: 'Antonyms' },
] as const

type ColumnSettingsProps = {
  preferences: BoardPreferences
  onSave: (preferences: BoardPreferences) => Promise<void> | void
}

export function ColumnSettings({ preferences, onSave }: ColumnSettingsProps) {
  function toggle(key: string) {
    const hidden = new Set(preferences.hiddenColumns)
    if (hidden.has(key)) hidden.delete(key)
    else hidden.add(key)

    void onSave({ ...preferences, hiddenColumns: [...hidden] })
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Columns3 /> Setting Columns <ChevronDown />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-52 rounded-lg border border-border bg-popover p-1.5 text-popover-foreground shadow-[0_12px_36px_rgba(16,32,29,0.14)] data-[state=open]:animate-in data-[state=closed]:animate-out"
        >
          <DropdownMenu.Label className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Board columns</DropdownMenu.Label>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          {optionalColumns.map((column) => (
            <DropdownMenu.CheckboxItem
              key={column.key}
              checked={!preferences.hiddenColumns.includes(column.key)}
              onCheckedChange={() => toggle(column.key)}
              onSelect={(event) => event.preventDefault()}
              className="relative flex min-h-9 cursor-pointer select-none items-center rounded-md py-2 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground"
            >
              <span className="absolute left-2 grid size-4 place-items-center">
                <DropdownMenu.ItemIndicator><Check className="size-3.5" /></DropdownMenu.ItemIndicator>
              </span>
              {column.name}
            </DropdownMenu.CheckboxItem>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
