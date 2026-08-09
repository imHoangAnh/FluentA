import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { Check, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { dropdownContentClassName, dropdownItemClassName } from '@/shared/components/ui/dropdown-styles'
import { DASHBOARD_WIDGET_CATALOG, type DashboardWidgetId } from '../dashboard-widgets'

type DashboardWidgetMenuProps = {
  visibleWidgets: readonly DashboardWidgetId[]
  onToggle: (id: DashboardWidgetId) => void
}

export function DashboardWidgetMenu({ visibleWidgets, onToggle }: DashboardWidgetMenuProps) {
  return (
    <Menu as="div" className="relative inline-block">
      <MenuButton as={Button} variant="outline" size="sm" type="button" aria-label="Overview widgets">
        <SlidersHorizontal aria-hidden="true" />
        <span>Widgets</span>
      </MenuButton>
      <MenuItems anchor={{ to: 'bottom end', gap: '8px' }} transition className={`${dropdownContentClassName} min-w-56`}>
        {DASHBOARD_WIDGET_CATALOG.map((widget) => {
          const checked = visibleWidgets.includes(widget.id)
          const disabled = checked ? visibleWidgets.length <= 3 : visibleWidgets.length >= 6
          return (
            <MenuItem
              as="button"
              type="button"
              className={dropdownItemClassName}
              key={widget.id}
              disabled={disabled}
              aria-pressed={checked}
              onClick={() => onToggle(widget.id)}
            >
              <span className="mr-2 inline-flex size-4 items-center justify-center">
                {checked ? <Check className="size-4" aria-hidden="true" /> : null}
              </span>
              {widget.label}
            </MenuItem>
          )
        })}
      </MenuItems>
    </Menu>
  )
}
