import { Check, Circle, Plus, Star } from 'lucide-react'
import { type FormEvent, useState } from 'react'
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
import { formatWeekday } from '../todo-date'

type TodoWeekViewProps = {
  dates: string[]
  items: TodoItem[]
  selectedId: string | null
  creating: boolean
  onCreate: (date: string, title: string) => Promise<boolean>
  onSelect: (item: TodoItem) => void
  onToggle: (item: TodoItem) => void
  onToggleImportant: (item: TodoItem) => void
  onDuplicate: (item: TodoItem) => void
  onDelete: (item: TodoItem) => void
  onMove: (item: TodoItem, date: string, sortOrder: number) => void
}

function sorted(items: TodoItem[]) {
  return items.toSorted((left, right) =>
    Number(left.isCompleted) - Number(right.isCompleted)
    || left.sortOrder - right.sortOrder
    || (left.completedAt ?? left.createdAt).localeCompare(right.completedAt ?? right.createdAt),
  )
}

function WeekQuickAdd({ date, pending, onCreate }: { date: string; pending: boolean; onCreate: (title: string) => Promise<boolean> }) {
  const [title, setTitle] = useState('')
  const weekday = formatWeekday(date)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const normalized = title.trim()
    if (!normalized || pending) return
    if (await onCreate(normalized)) setTitle('')
  }

  return (
    <form className="todo-week-quick-add" onSubmit={submit}>
      <Plus aria-hidden="true" />
      <label className="sr-only" htmlFor={`todo-week-quick-title-${date}`}>Add a task for {weekday}</label>
      <input
        id={`todo-week-quick-title-${date}`}
        value={title}
        maxLength={240}
        autoComplete="off"
        placeholder="Add a task"
        onChange={(event) => setTitle(event.target.value)}
      />
      <button className="sr-only" type="submit" disabled={pending || !title.trim()}>Add task for {weekday}</button>
    </form>
  )
}

function TodoWeekRow({
  item,
  dates,
  selected,
  dragging,
  onSelect,
  onToggle,
  onToggleImportant,
  onDuplicate,
  onDelete,
  onMove,
  onDragStart,
  onDragEnd,
  onDrop,
}: {
  item: TodoItem
  dates: string[]
  selected: boolean
  dragging: boolean
  onSelect: () => void
  onToggle: () => void
  onToggleImportant: () => void
  onDuplicate: () => void
  onDelete: () => void
  onMove: (date: string) => void
  onDragStart: () => void
  onDragEnd: () => void
  onDrop: () => void
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <article
          aria-label={`Task options for ${item.title}`}
          className={`todo-week-row${item.isCompleted ? ' todo-week-row--completed' : ''}${selected ? ' todo-week-row--selected' : ''}${dragging ? ' todo-week-row--dragging' : ''}`}
          data-testid={`week-todo-${item.id}`}
          draggable
          role="listitem"
          tabIndex={0}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => { event.preventDefault(); event.stopPropagation(); onDrop() }}
        >
          <button
            className="todo-week-row__complete"
            type="button"
            aria-label={item.isCompleted ? `Mark ${item.title} as active` : `Mark ${item.title} as completed`}
            aria-pressed={item.isCompleted}
            onClick={onToggle}
          >
            {item.isCompleted ? <Check aria-hidden="true" /> : <Circle aria-hidden="true" />}
          </button>
          <button className="todo-week-row__title" type="button" onClick={onSelect}>{item.title}</button>
          <button
            className={`todo-week-row__important${item.isImportant ? ' todo-week-row__important--active' : ''}`}
            type="button"
            aria-label={item.isImportant ? `Remove importance from ${item.title}` : `Mark ${item.title} as important`}
            aria-pressed={item.isImportant}
            onClick={onToggleImportant}
          >
            <Star aria-hidden="true" fill={item.isImportant ? 'currentColor' : 'none'} />
          </button>
        </article>
      </ContextMenuTrigger>
      <ContextMenuContent aria-label={`Actions for ${item.title}`}>
        <ContextMenuItem onSelect={onToggle}>{item.isCompleted ? 'Mark as active' : 'Mark as completed'}</ContextMenuItem>
        <ContextMenuItem onSelect={onToggleImportant}>{item.isImportant ? 'Remove importance' : 'Mark as important'}</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={onDuplicate}>Duplicate task</ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger>Move task to...</ContextMenuSubTrigger>
          <ContextMenuSubContent>
            {dates.filter((date) => date !== item.date).map((date) => (
              <ContextMenuItem key={date} onSelect={() => onMove(date)}>Move to {formatWeekday(date)}</ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuItem className="text-destructive data-[highlighted]:text-destructive" onSelect={onDelete}>Delete task</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

function TodoDayColumn({
  date,
  items,
  dates,
  selectedId,
  creating,
  draggingId,
  onCreate,
  onSelect,
  onToggle,
  onToggleImportant,
  onDuplicate,
  onDelete,
  onMove,
  onDragStart,
  onDragEnd,
  onDrop,
}: {
  date: string
  items: TodoItem[]
  dates: string[]
  selectedId: string | null
  creating: boolean
  draggingId: string | null
  onCreate: (title: string) => Promise<boolean>
  onSelect: (item: TodoItem) => void
  onToggle: (item: TodoItem) => void
  onToggleImportant: (item: TodoItem) => void
  onDuplicate: (item: TodoItem) => void
  onDelete: (item: TodoItem) => void
  onMove: (item: TodoItem, date: string, sortOrder: number) => void
  onDragStart: (item: TodoItem) => void
  onDragEnd: () => void
  onDrop: (date: string, sortOrder: number) => void
}) {
  return (
    <section className="todo-week-day" data-testid={`week-day-${date}`}>
      <h2 className="todo-week-day__header">{formatWeekday(date)}</h2>
      <WeekQuickAdd date={date} pending={creating} onCreate={onCreate} />
      <div
        className="todo-week-day__tasks"
        role="list"
        aria-label={`${formatWeekday(date)} tasks`}
        onDragOver={(event) => event.preventDefault()}
        onDrop={() => onDrop(date, items.length)}
      >
        {items.map((item, index) => (
          <TodoWeekRow
            key={item.id}
            item={item}
            dates={dates}
            selected={selectedId === item.id}
            dragging={draggingId === item.id}
            onSelect={() => onSelect(item)}
            onToggle={() => onToggle(item)}
            onToggleImportant={() => onToggleImportant(item)}
            onDuplicate={() => onDuplicate(item)}
            onDelete={() => onDelete(item)}
            onMove={(targetDate) => onMove(item, targetDate, 0)}
            onDragStart={() => onDragStart(item)}
            onDragEnd={onDragEnd}
            onDrop={() => onDrop(date, index)}
          />
        ))}
      </div>
    </section>
  )
}

export function TodoWeekView({
  dates,
  items,
  selectedId,
  creating,
  onCreate,
  onSelect,
  onToggle,
  onToggleImportant,
  onDuplicate,
  onDelete,
  onMove,
}: TodoWeekViewProps) {
  const columns = new Map(dates.map((date) => [date, sorted(items.filter((item) => item.date === date))]))
  const [dragging, setDragging] = useState<TodoItem | null>(null)

  return (
    <section className="todo-week-grid" aria-label="Todo week">
      {dates.map((date) => (
        <TodoDayColumn
          key={date}
          date={date}
          dates={dates}
          items={columns.get(date) ?? []}
          selectedId={selectedId}
          creating={creating}
          draggingId={dragging?.id ?? null}
          onCreate={(title) => onCreate(date, title)}
          onSelect={onSelect}
          onToggle={onToggle}
          onToggleImportant={onToggleImportant}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          onMove={onMove}
          onDragStart={setDragging}
          onDragEnd={() => setDragging(null)}
          onDrop={(targetDate, targetIndex) => {
            if (!dragging) return
            onMove(dragging, targetDate, targetIndex)
            setDragging(null)
          }}
        />
      ))}
    </section>
  )
}
