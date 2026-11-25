import { type FormEvent, useMemo, useState } from 'react'
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CheckCircle2, Plus } from 'lucide-react'
import type { TodoItem } from '../api/todo.api'
import { computeTaskMinutes, formatMyDaySubtitleDate, formatScheduledDuration } from '../model/todo-date'
import { sortTodoItems } from '../model/todo-sort'
import { TodoTaskCard } from './TodoTaskCard'

type MyDayViewProps = {
  today: string
  items: TodoItem[]
  selectedId: string | null
  activeFilterLabel: string | null
  loading: boolean
  error: boolean
  creating: boolean
  onClearFilter: () => void
  onCreate: (title: string) => Promise<boolean>
  onSelect: (item: TodoItem) => void
  onToggle: (item: TodoItem) => void
  onDuplicate: (item: TodoItem) => void
  onDelete: (item: TodoItem) => void
  onPersistOrder: (orderedIds: string[]) => void
}

export function MyDayView({
  today,
  items,
  selectedId,
  activeFilterLabel,
  loading,
  error,
  creating,
  onClearFilter,
  onCreate,
  onSelect,
  onToggle,
  onDuplicate,
  onDelete,
  onPersistOrder,
}: MyDayViewProps) {
  const [title, setTitle] = useState('')
  const [completedExpanded, setCompletedExpanded] = useState(true)

  const openTasks = useMemo(
    () => sortTodoItems(items.filter((item) => !item.isCompleted), null, false),
    [items],
  )
  const completedTasks = useMemo(
    () => sortTodoItems(items.filter((item) => item.isCompleted), null, true),
    [items],
  )
  const totalScheduledMinutes = useMemo(
    () => openTasks.reduce((sum, item) => sum + computeTaskMinutes(item), 0),
    [openTasks],
  )
  const scheduledLabel = formatScheduledDuration(totalScheduledMinutes)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  async function submitTask(event: FormEvent) {
    event.preventDefault()
    const normalized = title.trim()
    if (!normalized) return
    if (await onCreate(normalized)) setTitle('')
  }

  function handleDragEnd(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) return
    const oldIndex = openTasks.findIndex((item) => item.id === event.active.id)
    const newIndex = openTasks.findIndex((item) => item.id === event.over?.id)
    if (oldIndex < 0 || newIndex < 0) return
    onPersistOrder(arrayMove(openTasks, oldIndex, newIndex).map((item) => item.id))
  }

  return (
    <section className="todo-center-pane" aria-label="My Day tasks">
      <header className="todo-center-header">
        <div>
          <h1>My Day</h1>
          <p className="todo-center-subtitle">
            {formatMyDaySubtitleDate(today)}
            {'  \u2022  '}
            {openTasks.length} {openTasks.length === 1 ? 'active task' : 'active tasks'}
            {scheduledLabel ? `  \u2022  ${scheduledLabel} scheduled` : ''}
          </p>
        </div>

        {activeFilterLabel ? (
          <button type="button" className="todo-filter-chip" onClick={onClearFilter}>
            <span>Filtered: {activeFilterLabel}</span>
            <span aria-hidden="true">{'\u00d7'}</span>
          </button>
        ) : null}
      </header>

      <form className="todo-quick-add" onSubmit={submitTask}>
        <Plus aria-hidden="true" />
        <label className="sr-only" htmlFor="todo-quick-title">Add a task for today</label>
        <input
          id="todo-quick-title"
          data-testid="todo-title-input"
          value={title}
          maxLength={240}
          autoComplete="off"
          placeholder="Add a task for today..."
          onChange={(event) => setTitle(event.target.value)}
        />
        <button type="submit" disabled={creating || !title.trim()}>
          {creating ? 'Adding...' : 'Add'}
        </button>
      </form>

      {loading ? <p className="todo-status-message" role="status">Loading tasks...</p> : null}
      {error ? <p className="todo-status-message todo-status-message--error" role="alert">Could not load My Day tasks.</p> : null}

      {!loading && !error ? (
        <div className="todo-task-sections">
          {openTasks.length > 0 ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={openTasks.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                <div className="todo-task-list" role="list" aria-label="Incomplete tasks">
                  {openTasks.map((item) => (
                    <TodoTaskCard
                      key={item.id}
                      item={item}
                      selected={selectedId === item.id}
                      sortable
                      testId={`todo-row-${item.id}`}
                      onSelect={onSelect}
                      onToggle={onToggle}
                      onDuplicate={onDuplicate}
                      onDelete={onDelete}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : null}

          {items.length === 0 ? (
            <div className="todo-empty-state" role="status">
              <CheckCircle2 aria-hidden="true" />
              <h2>{activeFilterLabel ? 'No matching tasks' : 'Your day is clear'}</h2>
              <p>
                {activeFilterLabel
                  ? 'Clear the active filter or add a new task.'
                  : 'Add one task when you are ready.'}
              </p>
            </div>
          ) : null}

          {completedTasks.length > 0 ? (
            <section className="todo-completed-section" aria-label="Completed tasks">
              <button
                type="button"
                className="todo-completed-section__heading"
                aria-expanded={completedExpanded}
                onClick={() => setCompletedExpanded((expanded) => !expanded)}
              >
                COMPLETED ({completedTasks.length})
              </button>

              {completedExpanded ? (
                <div className="todo-task-list" role="list">
                  {completedTasks.map((item) => (
                    <TodoTaskCard
                      key={item.id}
                      item={item}
                      selected={selectedId === item.id}
                      testId={`todo-row-${item.id}`}
                      onSelect={onSelect}
                      onToggle={onToggle}
                      onDuplicate={onDuplicate}
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
