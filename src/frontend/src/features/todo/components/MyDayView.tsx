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
import { CheckCircle2, ChevronRight, Plus } from 'lucide-react'
import type { TodoItem } from '../api/todo.api'
import { sortTodoItems, type TodoSortMode } from '../todo-sort'
import { TodoTaskRow } from './TodoTaskRow'

type MyDayViewProps = {
  items: TodoItem[]
  selectedId: string | null
  sortMode: TodoSortMode | null
  loading: boolean
  error: boolean
  creating: boolean
  onCreate: (title: string) => Promise<boolean>
  onSelect: (item: TodoItem) => void
  onToggle: (item: TodoItem) => void
  onToggleImportant: (item: TodoItem) => void
  onDelete: (item: TodoItem) => void
  onPersistOrder: (orderedIds: string[], disableSort: boolean) => void
}

export function MyDayView({
  items,
  selectedId,
  sortMode,
  loading,
  error,
  creating,
  onCreate,
  onSelect,
  onToggle,
  onToggleImportant,
  onDelete,
  onPersistOrder,
}: MyDayViewProps) {
  const [title, setTitle] = useState('')
  const [completedExpanded, setCompletedExpanded] = useState(false)
  const openTasks = useMemo(
    () => sortTodoItems(items.filter((item) => !item.isCompleted), sortMode, false),
    [items, sortMode],
  )
  const completedTasks = useMemo(
    () => sortTodoItems(items.filter((item) => item.isCompleted), sortMode, true),
    [items, sortMode],
  )
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
    if (!event.over || event.active.id === event.over.id) {
      if (sortMode) onPersistOrder(openTasks.map((item) => item.id), true)
      return
    }
    const oldIndex = openTasks.findIndex((item) => item.id === event.active.id)
    const newIndex = openTasks.findIndex((item) => item.id === event.over?.id)
    if (oldIndex < 0 || newIndex < 0) return
    onPersistOrder(arrayMove(openTasks, oldIndex, newIndex).map((item) => item.id), Boolean(sortMode))
  }

  function handleDragCancel() {
    if (sortMode) onPersistOrder(openTasks.map((item) => item.id), true)
  }

  return (
    <section className="todo-my-day" aria-label="My Day tasks">
      <form className="todo-quick-add" onSubmit={submitTask}>
        <Plus aria-hidden="true" />
        <label className="sr-only" htmlFor="todo-quick-title">Add a task</label>
        <input
          id="todo-quick-title"
          data-testid="todo-title-input"
          value={title}
          maxLength={240}
          autoComplete="off"
          placeholder="Add a task"
          onChange={(event) => setTitle(event.target.value)}
        />
        <button type="submit" disabled={creating || !title.trim()}>{creating ? 'Adding...' : 'Add'}</button>
      </form>

      {loading ? <p className="todo-my-day__status" role="status">Loading tasks...</p> : null}
      {error ? <p className="todo-my-day__status todo-my-day__status--error" role="alert">Could not load My Day tasks.</p> : null}

      {!loading && !error ? (
        <div className="todo-my-day__lists">
          {openTasks.length ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragCancel={handleDragCancel} onDragEnd={handleDragEnd}>
              <SortableContext items={openTasks.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                <div className="todo-my-day__task-list" role="list" aria-label="Incomplete tasks">
                  {openTasks.map((item) => (
                    <TodoTaskRow
                      key={item.id}
                      item={item}
                      selected={selectedId === item.id}
                      draggable
                      onSelect={onSelect}
                      onToggle={onToggle}
                      onToggleImportant={onToggleImportant}
                      onDelete={onDelete}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : null}

          {!items.length ? (
            <div className="todo-my-day__empty" role="status">
              <CheckCircle2 aria-hidden="true" />
              <h2>Your day is clear</h2>
              <p>Add one task when you are ready.</p>
            </div>
          ) : null}

          {completedTasks.length ? (
            <section className="todo-completed" aria-label="Completed tasks">
              <button
                className="todo-completed__toggle"
                type="button"
                aria-expanded={completedExpanded}
                onClick={() => setCompletedExpanded((expanded) => !expanded)}
              >
                <ChevronRight className={completedExpanded ? 'todo-completed__chevron--open' : ''} aria-hidden="true" />
                <span>Completed</span>
                <span className="todo-completed__count">{completedTasks.length}</span>
              </button>
              {completedExpanded ? (
                <div className="todo-my-day__task-list" role="list">
                  {completedTasks.map((item) => (
                    <TodoTaskRow
                      key={item.id}
                      item={item}
                      selected={selectedId === item.id}
                      draggable={false}
                      onSelect={onSelect}
                      onToggle={onToggle}
                      onToggleImportant={onToggleImportant}
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
