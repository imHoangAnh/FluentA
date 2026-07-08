import { Trash2 } from 'lucide-react'
import type { TodoItem } from '../../lib/api/todo.api'

type TodoWeekViewProps = {
  dates: string[]
  items: TodoItem[]
  selectedDate: string
  onSelectDate: (date: string) => void
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
  return items.toSorted((left, right) =>
    Number(left.isCompleted) - Number(right.isCompleted)
    || (left.completedAt ?? left.createdAt).localeCompare(right.completedAt ?? right.createdAt),
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
  return (
    <section
      className={`todo-week-day${selected ? ' todo-week-day--selected' : ''}`}
      data-testid={`week-day-${date}`}
    >
      <button className="todo-week-day__header" type="button" onClick={onSelect}>
        <strong>{formatWeekDay(date)}</strong>
        <span>{items.length}</span>
      </button>
      <div className="todo-week-day__tasks">
        {items.map((item) => (
          <article
            className={`todo-week-card${item.isCompleted ? ' todo-week-card--completed' : ''}`}
            data-testid={`week-todo-${item.id}`}
            key={item.id}
          >
            <header>
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
              <span />
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
}: TodoWeekViewProps) {
  const columns = new Map(dates.map((date) => [date, sorted(items.filter((item) => item.date === date))]))

  return (
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
  )
}
