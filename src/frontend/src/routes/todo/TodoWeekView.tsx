import { GripVertical, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { TodoItem } from '../../lib/api/todo.api'

type TodoWeekViewProps = {
  dates: string[]
  items: TodoItem[]
  selectedDate: string
  onSelectDate: (date: string) => void
  onToggle: (item: TodoItem, isCompleted: boolean) => void
  onDelete: (item: TodoItem) => void
  onMove: (item: TodoItem, date: string, sortOrder: number) => void
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
  return items.toSorted((left, right) =>
    Number(left.isCompleted) - Number(right.isCompleted)
    || left.sortOrder - right.sortOrder
    || (left.completedAt ?? left.createdAt).localeCompare(right.completedAt ?? right.createdAt),
  )
}

function TodoDayColumn({
  date,
  items,
  dates,
  selected,
  onSelect,
  onToggle,
  onDelete,
  onMove,
  draggingId,
  onDragStart,
  onDrop,
}: {
  date: string
  items: TodoItem[]
  dates: string[]
  selected: boolean
  onSelect: () => void
  onToggle: (item: TodoItem, isCompleted: boolean) => void
  onDelete: (item: TodoItem) => void
  onMove: (item: TodoItem, date: string, sortOrder: number) => void
  draggingId: string | null
  onDragStart: (item: TodoItem) => void
  onDrop: (date: string, sortOrder: number) => void
}) {
  return (
    <section
      className={`todo-week-day${selected ? ' todo-week-day--selected' : ''}`}
      data-testid={`week-day-${date}`}
    >
      <button className="todo-week-day__header" type="button" onClick={onSelect}>
        <strong>{formatWeekDay(date)}</strong>
        <span>{items.length}</span>
      </button>
      <div className="todo-week-day__tasks" onDragOver={(event) => event.preventDefault()} onDrop={() => onDrop(date, items.length)}>
        {items.map((item) => (
          <article
            className={`todo-week-card${item.isCompleted ? ' todo-week-card--completed' : ''}${draggingId === item.id ? ' todo-week-card--dragging' : ''}`}
            data-testid={`week-todo-${item.id}`}
            key={item.id}
            draggable
            onDragStart={() => onDragStart(item)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => { event.preventDefault(); event.stopPropagation(); onDrop(date, items.indexOf(item)) }}
          >
            <header>
              <button className="todo-week-card__drag" type="button" aria-label={`Drag ${item.title}`} onPointerDown={() => onDragStart(item)}><GripVertical size={15} /></button>
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
              <label className="sr-only" htmlFor={`move-${item.id}`}>Move {item.title}</label>
              <select id={`move-${item.id}`} value={date} onChange={(event) => onMove(item, event.target.value, 0)}>
                {dates.map((targetDate) => <option key={targetDate} value={targetDate}>Move to {formatWeekDay(targetDate)}</option>)}
              </select>
              <button className="icon-button icon-button--danger" type="button" aria-label={`Delete ${item.title}`} onClick={() => onDelete(item)}>
                <Trash2 size={15} />
              </button>
            </footer>
          </article>
        ))}
        {items.length === 0 ? <p className="todo-week-day__empty">No tasks for this day</p> : null}
      </div>
    </section>
  )
}

export function TodoWeekView({
  dates,
  items,
  selectedDate,
  onSelectDate,
  onToggle,
  onDelete,
  onMove,
}: TodoWeekViewProps) {
  const columns = new Map(dates.map((date) => [date, sorted(items.filter((item) => item.date === date))]))
  const [dragging, setDragging] = useState<TodoItem | null>(null)

  return (
    <section className="todo-week-grid" aria-label="Todo week">
      {dates.map((date) => (
        <TodoDayColumn
          date={date}
          items={columns.get(date) ?? []}
          dates={dates}
          key={date}
          selected={date === selectedDate}
          onSelect={() => onSelectDate(date)}
          onToggle={onToggle}
          onDelete={onDelete}
          onMove={onMove}
          draggingId={dragging?.id ?? null}
          onDragStart={setDragging}
          onDrop={(targetDate, targetIndex) => { if (dragging) { onMove(dragging, targetDate, targetIndex); setDragging(null) } }}
        />
      ))}
    </section>
  )
}
