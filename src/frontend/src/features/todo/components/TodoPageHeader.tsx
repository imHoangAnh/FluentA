import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { ArrowUpDown, CalendarDays, Check, ChevronLeft, ChevronRight, MoreHorizontal, Sun } from 'lucide-react'
import { dropdownContentClassName, dropdownItemClassName, dropdownLabelClassName } from '@/shared/components/ui/dropdown-styles'
import { TODO_SORT_OPTIONS, type TodoSortMode } from '../todo-sort'

type TodoPageHeaderProps = {
  view: 'my-day' | 'week'
  subtitle?: string
  sortMode: TodoSortMode | null
  onSortChange: (mode: TodoSortMode | null) => void
  onViewChange: (view: 'my-day' | 'week') => void
  onShiftWeek: (days: number) => void
}

export function TodoPageHeader({
  view,
  subtitle,
  sortMode,
  onSortChange,
  onViewChange,
  onShiftWeek,
}: TodoPageHeaderProps) {
  const title = view === 'my-day' ? 'My Day' : 'Week'

  return (
    <header className="todo-page-header">
      <div className="todo-page-header__identity">
        <div className="todo-page-header__title-row">
          {view === 'my-day' ? <Sun aria-hidden="true" /> : <CalendarDays aria-hidden="true" />}
          <h1>{title}</h1>
          <Menu as="div" className="relative inline-block">
              <MenuButton className="todo-page-header__icon-button" type="button" aria-label={`${title} menu`}>
                <MoreHorizontal aria-hidden="true" />
              </MenuButton>
              <MenuItems anchor={{ to: 'bottom start', gap: '6px' }} transition className={dropdownContentClassName}>
                <MenuItem
                  as="button"
                  type="button"
                  className={dropdownItemClassName}
                  onClick={() => onViewChange(view === 'my-day' ? 'week' : 'my-day')}
                >
                  {view === 'my-day' ? <CalendarDays className="mr-2 size-4" aria-hidden="true" /> : <Sun className="mr-2 size-4" aria-hidden="true" />}
                  {view === 'my-day' ? 'Week' : 'My Day'}
                </MenuItem>
              </MenuItems>
          </Menu>
        </div>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      <div className="todo-page-header__actions">
        {view === 'my-day' ? (
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
        ) : (
          <div className="todo-page-header__week-navigation">
            <button type="button" aria-label="Previous week" onClick={() => onShiftWeek(-7)}><ChevronLeft aria-hidden="true" /></button>
            <button type="button" aria-label="Next week" onClick={() => onShiftWeek(7)}><ChevronRight aria-hidden="true" /></button>
          </div>
        )}
      </div>
    </header>
  )
}
