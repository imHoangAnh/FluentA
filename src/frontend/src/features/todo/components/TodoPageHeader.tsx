import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ArrowUpDown, CalendarDays, Check, ChevronLeft, ChevronRight, MoreHorizontal, Sun } from 'lucide-react'
import { TODO_SORT_OPTIONS, type TodoSortMode } from '../todo-sort'

type TodoPageHeaderProps = {
  view: 'my-day' | 'week'
  subtitle?: string
  sortMode: TodoSortMode | null
  onSortChange: (mode: TodoSortMode | null) => void
  onViewChange: (view: 'my-day' | 'week') => void
  onShiftWeek: (days: number) => void
}

const menuContentClass = 'z-50 min-w-44 rounded-md border border-border bg-card p-1 shadow-lg outline-none'
const menuItemClass = 'flex h-8 cursor-pointer select-none items-center rounded-sm px-2 text-sm font-medium outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground'

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
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="todo-page-header__icon-button" type="button" aria-label={`${title} menu`}>
                <MoreHorizontal aria-hidden="true" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className={menuContentClass} sideOffset={6} align="start">
                <DropdownMenu.Item
                  className={menuItemClass}
                  onSelect={() => onViewChange(view === 'my-day' ? 'week' : 'my-day')}
                >
                  {view === 'my-day' ? <CalendarDays className="mr-2 size-4" aria-hidden="true" /> : <Sun className="mr-2 size-4" aria-hidden="true" />}
                  {view === 'my-day' ? 'Week' : 'My Day'}
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      <div className="todo-page-header__actions">
        {view === 'my-day' ? (
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="todo-page-header__action" type="button" aria-label="Sort My Day tasks">
                <ArrowUpDown aria-hidden="true" />
                <span>{sortMode ? TODO_SORT_OPTIONS.find((option) => option.value === sortMode)?.label : 'Sort'}</span>
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className={menuContentClass} sideOffset={6} align="end">
                <DropdownMenu.Label className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Sort by</DropdownMenu.Label>
                {TODO_SORT_OPTIONS.map((option) => (
                  <DropdownMenu.Item
                    className={menuItemClass}
                    key={option.value}
                    onSelect={() => onSortChange(sortMode === option.value ? null : option.value)}
                  >
                    <span className="mr-2 inline-flex size-4 items-center justify-center">
                      {sortMode === option.value ? <Check className="size-4" aria-hidden="true" /> : null}
                    </span>
                    {option.label}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
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
