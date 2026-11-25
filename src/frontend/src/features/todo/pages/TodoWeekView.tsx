import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { type FormEvent, useMemo, useState } from 'react'
import type { TodoItem } from '../api/todo.api'
import {
  computeTaskMinutes,
  formatDayGroupHeading,
  formatScheduledDuration,
  formatShortDate,
  formatShortWeekday,
  formatWeekShortRange,
  getDayNumber,
} from '../model/todo-date'
import { sortTodoItems } from '../model/todo-sort'
import { TodoTaskCard } from '../components/TodoTaskCard'

type TodoWeekViewProps = {
  today: string
  dates: string[]
  selectedDate: string
  items: TodoItem[]
  selectedId: string | null
  activeFilterLabel: string | null
  loading: boolean
  error: boolean
  creating: boolean
  onClearFilter: () => void
  onSelectDate: (date: string) => void
  onShiftWeek: (days: number) => void
  onThisWeek: () => void
  onCreate: (date: string, title: string) => Promise<boolean>
  onSelect: (item: TodoItem) => void
  onToggle: (item: TodoItem) => void
  onDuplicate: (item: TodoItem) => void
  onDelete: (item: TodoItem) => void
  onMove: (item: TodoItem, date: string, sortOrder: number) => void
}

export function TodoWeekView({
  today,
  dates,
  selectedDate,
  items,
  selectedId,
  activeFilterLabel,
  loading,
  error,
  creating,
  onClearFilter,
  onSelectDate,
  onShiftWeek,
  onThisWeek,
  onCreate,
  onSelect,
  onToggle,
  onDuplicate,
  onDelete,
  onMove,
}: TodoWeekViewProps) {
  const [title, setTitle] = useState('')
  const [completedExpanded, setCompletedExpanded] = useState(true)
  const [draggingItem, setDraggingItem] = useState<TodoItem | null>(null)
  const [dragOverDate, setDragOverDate] = useState<string | null>(null)

  const weekActiveTasks = useMemo(() => items.filter((item) => !item.isCompleted), [items])
  const weekScheduledMinutes = useMemo(
    () => weekActiveTasks.reduce((sum, item) => sum + computeTaskMinutes(item), 0),
    [weekActiveTasks],
  )
  const weekScheduledLabel = formatScheduledDuration(weekScheduledMinutes)

  const dayItems = useMemo(
    () => items.filter((item) => item.date === selectedDate),
    [items, selectedDate],
  )
  const dayOpenTasks = useMemo(
    () => sortTodoItems(dayItems.filter((item) => !item.isCompleted), null, false),
    [dayItems],
  )
  const dayCompletedTasks = useMemo(
    () => sortTodoItems(dayItems.filter((item) => item.isCompleted), null, true),
    [dayItems],
  )
  const dayScheduledMinutes = useMemo(
    () => dayOpenTasks.reduce((sum, item) => sum + computeTaskMinutes(item), 0),
    [dayOpenTasks],
  )
  const dayScheduledLabel = formatScheduledDuration(dayScheduledMinutes)

  const dayStats = useMemo(() => {
    const map = new Map<string, { active: number; total: number }>()
    for (const date of dates) {
      map.set(date, { active: 0, total: 0 })
    }
    for (const item of items) {
      const current = map.get(item.date)
      if (!current) continue
      current.total += 1
      if (!item.isCompleted) current.active += 1
    }
    return map
  }, [dates, items])

  async function submitTask(event: FormEvent) {
    event.preventDefault()
    const normalized = title.trim()
    if (!normalized || creating) return
    if (await onCreate(selectedDate, normalized)) setTitle('')
  }

  const shortSelectedDate = formatShortDate(selectedDate)

  return (
    <section className="todo-center-pane" aria-label="My Week tasks">
      <header className="todo-center-header">
        <div>
          <h1>My Week</h1>
          <p className="todo-center-subtitle">
            {formatWeekShortRange(dates[0], dates[6])}
            {'  \u2022  '}
            {weekActiveTasks.length} {weekActiveTasks.length === 1 ? 'active task' : 'active tasks'}
            {weekScheduledLabel ? `  \u2022  ${weekScheduledLabel} scheduled` : ''}
          </p>
        </div>

        <div className="todo-week-header-right">
          {activeFilterLabel ? (
            <button type="button" className="todo-filter-chip" onClick={onClearFilter}>
              <span>Filtered: {activeFilterLabel}</span>
              <span aria-hidden="true">{'\u00d7'}</span>
            </button>
          ) : null}

          <div className="todo-week-pager" role="group" aria-label="Week navigation">
            <button type="button" className="todo-week-pager__nav" aria-label="Previous week" onClick={() => onShiftWeek(-7)}>
              <ChevronLeft aria-hidden="true" />
            </button>
            <span className="todo-week-pager__divider" aria-hidden="true" />
            <button type="button" className="todo-week-pager__today" onClick={onThisWeek}>
              This Week
            </button>
            <span className="todo-week-pager__divider" aria-hidden="true" />
            <button type="button" className="todo-week-pager__nav" aria-label="Next week" onClick={() => onShiftWeek(7)}>
              <ChevronRight aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <div className="todo-week-strip" role="tablist" aria-label="Days of the week">
        {dates.map((date) => {
          const isSelected = date === selectedDate
          const stats = dayStats.get(date) ?? { active: 0, total: 0 }
          const allDone = stats.total > 0 && stats.active === 0
          const statusText = allDone ? 'Done' : isSelected ? `${stats.active} left` : `${stats.active}`

          return (
            <button
              key={date}
              type="button"
              role="tab"
              aria-selected={isSelected}
              data-testid={`week-day-${date}`}
              className={[
                'todo-week-strip__day',
                isSelected ? 'todo-week-strip__day--selected' : '',
                dragOverDate === date ? 'todo-week-strip__day--drop-target' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => onSelectDate(date)}
              onDragOver={(event) => {
                event.preventDefault()
                setDragOverDate(date)
              }}
              onDragLeave={() => setDragOverDate((current) => (current === date ? null : current))}
              onDrop={(event) => {
                event.preventDefault()
                setDragOverDate(null)
                if (draggingItem && draggingItem.date !== date) {
                  onMove(draggingItem, date, 0)
                }
                setDraggingItem(null)
              }}
            >
              <span className="todo-week-strip__top">
                <span className="todo-week-strip__weekday">{formatShortWeekday(date)}</span>
                <span className="todo-week-strip__daynum">{getDayNumber(date)}</span>
              </span>
              <span className={`todo-week-strip__meta${allDone ? ' todo-week-strip__meta--done' : ''}`}>
                {statusText}
              </span>
            </button>
          )
        })}
      </div>

      <form className="todo-quick-add" onSubmit={submitTask}>
        <Plus aria-hidden="true" />
        <label className="sr-only" htmlFor="todo-week-quick-title">Add a task for {shortSelectedDate}</label>
        <input
          id="todo-week-quick-title"
          data-testid="todo-week-title-input"
          value={title}
          maxLength={240}
          autoComplete="off"
          placeholder={`Add a task for ${shortSelectedDate}...`}
          onChange={(event) => setTitle(event.target.value)}
        />
        <button type="submit" disabled={creating || !title.trim()}>
          {creating ? 'Adding...' : 'Add'}
        </button>
      </form>

      {loading ? <p className="todo-status-message" role="status">Loading week...</p> : null}
      {error ? <p className="todo-status-message todo-status-message--error" role="alert">Could not load Todo week.</p> : null}

      {!loading && !error ? (
        <div className="todo-task-sections">
          <div className="todo-day-group">
            <div className="todo-day-group__header">
              <span className="todo-day-group__title">{formatDayGroupHeading(selectedDate, today)}</span>
              <span className="todo-day-group__meta">
                {dayOpenTasks.length} active{dayScheduledLabel ? `  \u2022  ${dayScheduledLabel}` : ''}
              </span>
            </div>

            {dayOpenTasks.length > 0 ? (
              <div className="todo-task-list" role="list" aria-label={`${shortSelectedDate} tasks`}>
                {dayOpenTasks.map((item) => (
                  <TodoTaskCard
                    key={item.id}
                    item={item}
                    selected={selectedId === item.id}
                    nativeDraggable
                    testId={`week-todo-${item.id}`}
                    moveDates={dates}
                    onSelect={onSelect}
                    onToggle={onToggle}
                    onDuplicate={onDuplicate}
                    onMoveDate={(task, targetDate) => onMove(task, targetDate, 0)}
                    onDelete={onDelete}
                    onNativeDragStart={setDraggingItem}
                    onNativeDragEnd={() => {
                      setDraggingItem(null)
                      setDragOverDate(null)
                    }}
                  />
                ))}
              </div>
            ) : (
              <p className="todo-day-group__empty">No active tasks for {shortSelectedDate}.</p>
            )}
          </div>

          {dayCompletedTasks.length > 0 ? (
            <section className="todo-completed-section" aria-label="Completed tasks">
              <button
                type="button"
                className="todo-completed-section__heading"
                aria-expanded={completedExpanded}
                onClick={() => setCompletedExpanded((expanded) => !expanded)}
              >
                COMPLETED ({dayCompletedTasks.length})
              </button>

              {completedExpanded ? (
                <div className="todo-task-list" role="list">
                  {dayCompletedTasks.map((item) => (
                    <TodoTaskCard
                      key={item.id}
                      item={item}
                      selected={selectedId === item.id}
                      testId={`week-todo-${item.id}`}
                      moveDates={dates}
                      onSelect={onSelect}
                      onToggle={onToggle}
                      onDuplicate={onDuplicate}
                      onMoveDate={(task, targetDate) => onMove(task, targetDate, 0)}
                      onDelete={onDelete}
                    />
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
