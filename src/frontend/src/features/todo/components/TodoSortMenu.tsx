import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { ArrowUpDown, Check } from 'lucide-react'
import { dropdownContentClassName, dropdownItemClassName, dropdownLabelClassName } from '@/shared/components/ui/dropdown-styles'
import { TODO_SORT_OPTIONS, type TodoSortMode } from '../todo-sort'

type TodoSortMenuProps = {
  sortMode: TodoSortMode | null
  onSortChange: (mode: TodoSortMode | null) => void
}

export function TodoSortMenu({ sortMode, onSortChange }: TodoSortMenuProps) {
  return (
    <Menu as="div" className="relative inline-block">
      <MenuButton className="todo-page-header__action" type="button" aria-label="Sort My Day tasks">
        <ArrowUpDown aria-hidden="true" />
        <span>{sortMode ? TODO_SORT_OPTIONS.find((option) => option.value === sortMode)?.label : 'Sort'}</span>
      </MenuButton>
      <MenuItems anchor={{ to: 'bottom end', gap: '6px' }} transition className={dropdownContentClassName}>
        <div className={dropdownLabelClassName}>Sort by</div>
        {TODO_SORT_OPTIONS.map((option) => (
          <MenuItem
            as="button"
            type="button"
            className={dropdownItemClassName}
            key={option.value}
            onClick={() => onSortChange(sortMode === option.value ? null : option.value)}
          >
            <span className="mr-2 inline-flex size-4 items-center justify-center">
              {sortMode === option.value ? <Check className="size-4" aria-hidden="true" /> : null}
            </span>
            {option.label}
          </MenuItem>
        ))}
      </MenuItems>
    </Menu>
  )
}
