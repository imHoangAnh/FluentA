import { Check, ChevronDown, Columns3 } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Button } from '@/shared/components/ui/button'
import { menuContentClassName, menuItemClassName, menuLabelClassName, menuSeparatorClassName } from '@/shared/components/ui/menu-styles'
import { cn } from '@/shared/lib/utils'
import type { BoardPreferences } from '../api/vocabulary.api'

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
          className={cn(menuContentClassName, 'min-w-52')}
        >
          <DropdownMenu.Label className={menuLabelClassName}>Board columns</DropdownMenu.Label>
          <DropdownMenu.Separator className={menuSeparatorClassName} />
          {optionalColumns.map((column) => (
            <DropdownMenu.CheckboxItem
              key={column.key}
              checked={!preferences.hiddenColumns.includes(column.key)}
              onCheckedChange={() => toggle(column.key)}
              onSelect={(event) => event.preventDefault()}
              className={cn(menuItemClassName, 'relative pl-8')}
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
