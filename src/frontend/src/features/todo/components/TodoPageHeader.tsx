import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { CalendarDays, ChevronLeft, ChevronRight, MoreHorizontal, Sun } from 'lucide-react'
import { dropdownContentClassName, dropdownItemClassName } from '@/shared/components/ui/dropdown-styles'

type TodoPageHeaderProps = {
  view: 'my-day' | 'week'
  subtitle?: string
  onViewChange: (view: 'my-day' | 'week') => void
  onShiftWeek: (days: number) => void
}

export function TodoPageHeader({
  view,
  subtitle,
  onViewChange,
  onShiftWeek,
}: TodoPageHeaderProps) {
  const title = view === 'my-day' ? 'My Day' : 'Week'

  return (
    <header className={`todo-page-header todo-page-header--${view}`}>
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
        {view === 'week' ? (
          <div className="todo-page-header__week-navigation">
            <button type="button" aria-label="Previous week" onClick={() => onShiftWeek(-7)}><ChevronLeft aria-hidden="true" /></button>
            <button type="button" aria-label="Next week" onClick={() => onShiftWeek(7)}><ChevronRight aria-hidden="true" /></button>
          </div>
        ) : null}
      </div>
    </header>
  )
}
