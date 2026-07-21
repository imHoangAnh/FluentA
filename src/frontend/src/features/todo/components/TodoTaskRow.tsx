import { CSS } from '@dnd-kit/utilities'
import { useSortable } from '@dnd-kit/sortable'
import { Check, Circle, Star, Trash2 } from 'lucide-react'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/shared/components/ui/context-menu'
import type { TodoItem } from '../api/todo.api'

type TodoTaskRowProps = {
  item: TodoItem
  selected: boolean
  draggable: boolean
  onSelect: (item: TodoItem) => void
  onToggle: (item: TodoItem) => void
  onToggleImportant: (item: TodoItem) => void
  onDelete: (item: TodoItem) => void
}

export function TodoTaskRow({
  item,
  selected,
  draggable,
  onSelect,
  onToggle,
  onToggleImportant,
  onDelete,
}: TodoTaskRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: !draggable,
  })

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <article
          ref={setNodeRef}
          role="listitem"
          className={`todo-my-day-row${selected ? ' todo-my-day-row--selected' : ''}${item.isCompleted ? ' todo-my-day-row--completed' : ''}${isDragging ? ' todo-my-day-row--dragging' : ''}`}
          data-testid={`todo-row-${item.id}`}
          style={{ transform: CSS.Transform.toString(transform), transition }}
        >
          <button
            className="todo-my-day-row__complete"
            type="button"
            aria-label={item.isCompleted ? `Mark ${item.title} as active` : `Mark ${item.title} as completed`}
            onClick={() => onToggle(item)}
          >
            {item.isCompleted ? <Check aria-hidden="true" /> : <Circle aria-hidden="true" />}
          </button>
          <button
            className="todo-my-day-row__title"
            type="button"
            onClick={() => onSelect(item)}
            {...(draggable ? attributes : {})}
            {...(draggable ? listeners : {})}
          >
            <span>{item.title}</span>
          </button>
          <button
            className={`todo-my-day-row__important${item.isImportant ? ' todo-my-day-row__important--active' : ''}`}
            type="button"
            aria-label={item.isImportant ? `Remove importance from ${item.title}` : `Mark ${item.title} as important`}
            aria-pressed={item.isImportant}
            onClick={() => onToggleImportant(item)}
          >
            <Star aria-hidden="true" fill={item.isImportant ? 'currentColor' : 'none'} />
          </button>
        </article>
      </ContextMenuTrigger>
      <ContextMenuContent aria-label={`Actions for ${item.title}`}>
        <ContextMenuItem onSelect={() => onToggle(item)}>
          {item.isCompleted ? <Circle className="mr-2 size-4" aria-hidden="true" /> : <Check className="mr-2 size-4" aria-hidden="true" />}
          {item.isCompleted ? 'Mark as active' : 'Mark as completed'}
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => onToggleImportant(item)}>
          <Star className="mr-2 size-4" aria-hidden="true" fill={item.isImportant ? 'currentColor' : 'none'} />
          {item.isImportant ? 'Remove importance' : 'Mark as important'}
        </ContextMenuItem>
        <ContextMenuItem className="text-destructive focus:text-destructive" onSelect={() => onDelete(item)}>
          <Trash2 className="mr-2 size-4" aria-hidden="true" />
          Delete task
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
