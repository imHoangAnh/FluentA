import { CSS } from '@dnd-kit/utilities'
import { useSortable } from '@dnd-kit/sortable'
import { Check, Copy, Trash2 } from 'lucide-react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/shared/components/ui/context-menu'
import type { TodoItem } from '../api/todo.api'
import { formatShortDate } from '../model/todo-date'

type TodoTaskCardProps = {
  item: TodoItem
  selected: boolean
  sortable?: boolean
  nativeDraggable?: boolean
  testId: string
  moveDates?: string[]
  onSelect: (item: TodoItem) => void
  onToggle: (item: TodoItem) => void
  onDuplicate?: (item: TodoItem) => void
  onMoveDate?: (item: TodoItem, date: string) => void
  onDelete: (item: TodoItem) => void
  onNativeDragStart?: (item: TodoItem) => void
  onNativeDragEnd?: () => void
}

export function TodoTaskCard({
  item,
  selected,
  sortable = false,
  nativeDraggable = false,
  testId,
  moveDates,
  onSelect,
  onToggle,
  onDuplicate,
  onMoveDate,
  onDelete,
  onNativeDragStart,
  onNativeDragEnd,
}: TodoTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: !sortable,
  })

  const subtasks = item.subtasks ?? []
  const completedSubtasks = subtasks.filter((subtask) => subtask.isCompleted).length
  const tags = item.tags ?? []
  const hasMetadata = !item.isCompleted && Boolean(
    item.scheduledStartTime || subtasks.length > 0 || item.priority || tags.length > 0,
  )

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <article
          ref={setNodeRef}
          role="listitem"
          data-testid={testId}
          draggable={nativeDraggable}
          style={sortable ? { transform: CSS.Transform.toString(transform), transition } : undefined}
          onDragStart={nativeDraggable ? () => onNativeDragStart?.(item) : undefined}
          onDragEnd={nativeDraggable ? () => onNativeDragEnd?.() : undefined}
          className={[
            'todo-task-card',
            item.isCompleted ? 'todo-task-card--completed' : '',
            selected ? 'todo-task-card--selected' : '',
            isDragging ? 'todo-task-card--dragging' : '',
          ].filter(Boolean).join(' ')}
        >
          <div className="todo-task-card__main-row">
            <button
              type="button"
              className={`todo-task-card__checkbox${item.isCompleted ? ' todo-task-card__checkbox--checked' : ''}`}
              aria-label={item.isCompleted ? `Mark ${item.title} as active` : `Mark ${item.title} as completed`}
              aria-pressed={item.isCompleted}
              onClick={() => onToggle(item)}
            >
              {item.isCompleted ? <Check aria-hidden="true" /> : null}
            </button>

            <button
              type="button"
              className="todo-task-card__title"
              onClick={() => onSelect(item)}
              {...(sortable ? attributes : {})}
              {...(sortable ? listeners : {})}
            >
              {item.title}
            </button>
          </div>

          {hasMetadata ? (
            <div className="todo-task-card__meta">
              {item.scheduledStartTime ? (
                <span className="todo-pill todo-pill--primary">{item.scheduledStartTime}</span>
              ) : null}

              {subtasks.length > 0 ? (
                <span className="todo-pill todo-pill--neutral">
                  {completedSubtasks}/{subtasks.length} subtasks
                </span>
              ) : null}

              {item.priority ? (
                <span className={`todo-pill todo-pill--${item.priority.tone}`}>
                  {item.priority.name}
                </span>
              ) : null}

              {tags.map((tag) => (
                <span key={tag.id} className="todo-task-card__tag">
                  #{tag.name}
                </span>
              ))}
            </div>
          ) : null}
        </article>
      </ContextMenuTrigger>

      <ContextMenuContent aria-label={`Actions for ${item.title}`}>
        <ContextMenuItem onSelect={() => onToggle(item)}>
          <Check className="mr-2 size-4" aria-hidden="true" />
          {item.isCompleted ? 'Mark as active' : 'Mark as completed'}
        </ContextMenuItem>
        {onDuplicate ? (
          <ContextMenuItem onSelect={() => onDuplicate(item)}>
            <Copy className="mr-2 size-4" aria-hidden="true" />
            Duplicate task
          </ContextMenuItem>
        ) : null}
        {moveDates && moveDates.length > 0 && onMoveDate ? (
          <ContextMenuSub>
            <ContextMenuSubTrigger>Move task to...</ContextMenuSubTrigger>
            <ContextMenuSubContent>
              {moveDates
                .filter((date) => date !== item.date)
                .map((date) => (
                  <ContextMenuItem key={date} onSelect={() => onMoveDate(item, date)}>
                    Move to {formatShortDate(date)}
                  </ContextMenuItem>
                ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
        ) : null}
        <ContextMenuSeparator />
        <ContextMenuItem className="text-destructive data-[highlighted]:text-destructive" onSelect={() => onDelete(item)}>
          <Trash2 className="mr-2 size-4" aria-hidden="true" />
          Delete task
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
