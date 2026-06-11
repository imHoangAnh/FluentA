import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2 } from 'lucide-react'
import type { TodoItem } from '../../lib/api/todo.api'

type LayoutUpdate = {
  id: string
  date: string
  sortOrder: number
}

type TodoWeekViewProps = {
  dates: string[]
  items: TodoItem[]
  selectedDate: string
  onSelectDate: (date: string) => void
  onLayoutChange: (items: TodoItem[], updates: LayoutUpdate[]) => void
  onToggle: (item: TodoItem, isCompleted: boolean) => void
  onDelete: (item: TodoItem) => void
}

function formatWeekDay(dateValue: string) {
  const [year, month, day] = dateValue.split('-').map(Number)
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(year, month - 1, day))
}

function sorted(items: TodoItem[]) {
  return items.toSorted((left, right) => left.sortOrder - right.sortOrder || left.createdAt.localeCompare(right.createdAt))
}

function normalizeColumn(items: TodoItem[], date: string) {
  return items.map((item, index) => ({ ...item, date, sortOrder: index }))
}

const desktopCollisionDetection: CollisionDetection = (args) => {
  const candidates = args.droppableContainers.filter((container) => container.id !== args.active.id)
  return closestCenter({ ...args, droppableContainers: candidates })
}

function SortableTodoCard({
  item,
  onToggle,
  onDelete,
}: {
  item: TodoItem
  onToggle: (item: TodoItem, isCompleted: boolean) => void
  onDelete: (item: TodoItem) => void
}) {
  const { attributes, listeners, setActivatorNodeRef, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: { date: item.date, type: 'todo' },
  })

  return (
    <article
      className={`todo-week-card${item.isCompleted ? ' todo-week-card--completed' : ''}${isDragging ? ' todo-week-card--dragging' : ''}`}
      data-testid={`week-todo-${item.id}`}
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <header>
        <button
          className="todo-drag-handle"
          type="button"
          aria-label={`Drag ${item.title}`}
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} />
        </button>
        <label>
          <input
            aria-label={`Complete ${item.title}`}
            checked={item.isCompleted}
            type="checkbox"
            onChange={(event) => onToggle(item, event.target.checked)}
          />
          <span>{item.title}</span>
        </label>
      </header>
      {item.note ? <p>{item.note}</p> : null}
      <footer>
        {item.isCarriedOver ? <span className="todo-badge">Carried over</span> : <span />}
        <button className="icon-button icon-button--danger" type="button" aria-label={`Delete ${item.title}`} onClick={() => onDelete(item)}>
          <Trash2 size={15} />
        </button>
      </footer>
    </article>
  )
}

function TodoDayColumn({
  date,
  items,
  selected,
  onSelect,
  onToggle,
  onDelete,
}: {
  date: string
  items: TodoItem[]
  selected: boolean
  onSelect: () => void
  onToggle: (item: TodoItem, isCompleted: boolean) => void
  onDelete: (item: TodoItem) => void
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `day:${date}`,
    data: { date, type: 'day' },
  })

  return (
    <section
      className={`todo-week-day${selected ? ' todo-week-day--selected' : ''}${isOver ? ' todo-week-day--over' : ''}`}
      data-testid={`week-day-${date}`}
      ref={setNodeRef}
    >
      <button className="todo-week-day__header" type="button" onClick={onSelect}>
        <strong>{formatWeekDay(date)}</strong>
        <span>{items.length}</span>
      </button>
      <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <div className="todo-week-day__tasks">
          {items.map((item) => <SortableTodoCard item={item} key={item.id} onToggle={onToggle} onDelete={onDelete} />)}
          {items.length === 0 ? <p className="todo-week-day__empty">Drop tasks here</p> : null}
        </div>
      </SortableContext>
    </section>
  )
}

export function TodoWeekView({
  dates,
  items,
  selectedDate,
  onSelectDate,
  onLayoutChange,
  onToggle,
  onDelete,
}: TodoWeekViewProps) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const columns = new Map(dates.map((date) => [date, sorted(items.filter((item) => item.date === date))]))

  function handleDragEnd(event: DragEndEvent) {
    const activeItem = items.find((item) => item.id === event.active.id)
    if (!activeItem || !event.over) return

    const overItem = items.find((item) => item.id === event.over?.id)
    const targetDate = String(event.over.data.current?.date ?? overItem?.date ?? '')
    if (!targetDate || !columns.has(targetDate)) return

    const sourceDate = activeItem.date
    const sourceItems = columns.get(sourceDate) ?? []
    const targetItems = columns.get(targetDate) ?? []
    let changed: TodoItem[]

    if (sourceDate === targetDate) {
      const oldIndex = sourceItems.findIndex((item) => item.id === activeItem.id)
      const newIndex = overItem
        ? targetItems.findIndex((item) => item.id === overItem.id)
        : event.delta.y < 0 ? 0 : targetItems.length - 1
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return
      const reordered = normalizeColumn(arrayMove(sourceItems, oldIndex, newIndex), targetDate)
      changed = items.map((item) => reordered.find((next) => next.id === item.id) ?? item)
    } else {
      const sourceWithoutActive = sourceItems.filter((item) => item.id !== activeItem.id)
      const activeCenter = event.active.rect.current.translated
        ? event.active.rect.current.translated.top + event.active.rect.current.translated.height / 2
        : event.over.rect.top
      const insertAt = overItem
        ? targetItems.findIndex((item) => item.id === overItem.id)
        : activeCenter < event.over.rect.top + event.over.rect.height / 2 ? 0 : targetItems.length
      const nextSource = normalizeColumn(sourceWithoutActive, sourceDate)
      const nextTargetRaw = [...targetItems]
      nextTargetRaw.splice(Math.max(0, insertAt), 0, { ...activeItem, date: targetDate })
      const nextTarget = normalizeColumn(nextTargetRaw, targetDate)
      changed = items.map((item) =>
        nextSource.find((next) => next.id === item.id)
        ?? nextTarget.find((next) => next.id === item.id)
        ?? item,
      )
    }

    const updates = changed
      .filter((item) => item.date !== items.find((previous) => previous.id === item.id)?.date
        || item.sortOrder !== items.find((previous) => previous.id === item.id)?.sortOrder)
      .map((item) => ({ id: item.id, date: item.date, sortOrder: item.sortOrder }))

    if (updates.length > 0) {
      onLayoutChange(changed, updates)
    }
  }

  return (
    <DndContext collisionDetection={desktopCollisionDetection} onDragEnd={handleDragEnd} sensors={sensors}>
      <section className="todo-week-grid" aria-label="Todo week">
        {dates.map((date) => (
          <TodoDayColumn
            date={date}
            items={columns.get(date) ?? []}
            key={date}
            selected={date === selectedDate}
            onSelect={() => onSelectDate(date)}
            onToggle={onToggle}
            onDelete={onDelete}
          />
        ))}
      </section>
    </DndContext>
  )
}
