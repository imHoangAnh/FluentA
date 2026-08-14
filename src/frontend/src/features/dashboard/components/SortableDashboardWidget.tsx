import { GripVertical, X } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ReactNode } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { cn } from '@/shared/lib/utils'
import { dashboardWidgetSlotClass, type DashboardWidgetId } from '../model/dashboard-widgets'

type SortableDashboardWidgetProps = {
  id: DashboardWidgetId
  index: number
  title: string
  description: string
  icon: ReactNode
  onRemove: () => void
  removeDisabled?: boolean
  footer?: ReactNode
  children: ReactNode
}

export function SortableDashboardWidget({ id, index, title, description, icon, onRemove, removeDisabled = false, footer, children }: SortableDashboardWidgetProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('min-h-0 min-w-0', dashboardWidgetSlotClass(index), isDragging && 'relative z-10 opacity-70')}
      data-testid={`dashboard-widget-${id}`}
    >
      <Card className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden shadow-[0_1px_2px_rgba(16,32,29,0.04)]">
        <CardHeader className="shrink-0 flex-row items-start gap-2 p-3 sm:p-4">
          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-secondary text-secondary-foreground" aria-hidden="true">{icon}</span>
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-sm sm:text-base">{title}</CardTitle>
            <CardDescription className="mt-0.5 line-clamp-2 text-xs leading-5 sm:text-sm">{description}</CardDescription>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              {...attributes}
              {...listeners}
              type="button"
              variant="ghost"
              size="icon-sm"
              className="cursor-grab touch-none active:cursor-grabbing"
              aria-label={`Move ${title} widget`}
              title="Drag to move"
            >
              <GripVertical aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={removeDisabled}
              aria-label={`Remove ${title} widget`}
              title="Remove widget"
              onClick={onRemove}
            >
              <X aria-hidden="true" />
            </Button>
          </div>
        </CardHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer ? <div className="shrink-0 border-t border-border/70 p-3 sm:p-4">{footer}</div> : null}
      </Card>
    </div>
  )
}
