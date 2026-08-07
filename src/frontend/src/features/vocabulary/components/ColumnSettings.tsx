import { Check, ChevronDown, Columns3 } from 'lucide-react'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Button } from '@/shared/components/ui/button'
import { dropdownContentClassName, dropdownItemClassName, dropdownLabelClassName, dropdownSeparatorClassName } from '@/shared/components/ui/dropdown-styles'
import { cn } from '@/shared/lib/utils'
import type { BoardPreferences } from '../api/vocabulary.api'

const optionalColumns = [
  { key: 'definition', name: 'Definition' },
  { key: 'note', name: 'Note' },
  { key: 'synonyms', name: 'Synonyms' },
  { key: 'antonyms', name: 'Antonyms' },
] as const

const ColumnMenuItem = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>((props, ref) => (
  <button {...props} ref={ref} role="menuitemcheckbox" />
))
ColumnMenuItem.displayName = 'ColumnMenuItem'

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
    <Menu as="div" className="relative inline-block">
        <MenuButton as={Button} type="button" variant="outline" size="sm">
          <Columns3 /> Setting Columns <ChevronDown />
        </MenuButton>
        <MenuItems anchor={{ to: 'bottom end', gap: '8px' }} transition className={cn(dropdownContentClassName, 'min-w-52')}>
          <div className={dropdownLabelClassName}>Board columns</div>
          <div className={dropdownSeparatorClassName} role="separator" />
          {optionalColumns.map((column) => (
            <MenuItem
              key={column.key}
              as={ColumnMenuItem}
              type="button"
              aria-checked={!preferences.hiddenColumns.includes(column.key)}
              className={cn(dropdownItemClassName, 'relative pl-8')}
              onClick={(event) => {
                event.preventDefault()
                toggle(column.key)
              }}
            >
              <span className="absolute left-2 grid size-4 place-items-center">
                {!preferences.hiddenColumns.includes(column.key) ? <Check className="size-3.5" /> : null}
              </span>
              {column.name}
            </MenuItem>
          ))}
        </MenuItems>
    </Menu>
  )
}
