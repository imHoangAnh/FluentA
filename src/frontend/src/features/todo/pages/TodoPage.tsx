import { type FormEvent, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as todoApi from '../api/todo.api'
import { TodoWeekView } from './TodoWeekView'
import { AppShell } from '@/shared/components/layout/AppShell'

type TodoView = 'day' | 'week'

function toDateInput(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function shiftDate(dateValue: string, days: number) {
  const [year, month, day] = dateValue.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + days)
  return toDateInput(date)
}

function formatDay(dateValue: string) {
  const [year, month, day] = dateValue.split('-').map(Number)
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, day))
}

function weekStart(dateValue: string) {
  const [year, month, day] = dateValue.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const offset = (date.getDay() + 6) % 7
  date.setDate(date.getDate() - offset)
  return toDateInput(date)
}

function weekDates(dateValue: string) {
  const start = weekStart(dateValue)
  return Array.from({ length: 7 }, (_, index) => shiftDate(start, index))
}

export function TodoPage() {
  const queryClient = useQueryClient()

  const [selectedDate, setSelectedDate] = useState(() => toDateInput(new Date()))
  const [view, setView] = useState<TodoView>('day')
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [activeExpanded, setActiveExpanded] = useState(true)
  const [completedExpanded, setCompletedExpanded] = useState(false)

  const dates = useMemo(() => weekDates(selectedDate), [selectedDate])
  const weekKey = ['todo', 'range', dates[0], dates[6]]

  const todosQuery = useQuery({
    queryKey: ['todo', 'items', selectedDate],
    queryFn: () => todoApi.listByDate(selectedDate),
    enabled: view === 'day',
  })

  const weekQuery = useQuery({
    queryKey: weekKey,
    queryFn: () => todoApi.listByRange(dates[0], dates[6]),
    enabled: view === 'week',
  })

  const todos = useMemo(
    () => [...(todosQuery.data ?? [])],
    [todosQuery.data],
  )

  const weekTodos = useMemo(() => weekQuery.data ?? [], [weekQuery.data])
  const visibleTodos = view === 'day' ? todos : weekTodos
  const openTasks = visibleTodos.filter((item) => !item.isCompleted)
  const completedTasks = visibleTodos.filter((item) => item.isCompleted)

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['todo'] })
  }

  const createTodo = useMutation({
    mutationFn: todoApi.createTodo,
    onSuccess: async () => {
      setTitle('')
      setNote('')
      await refresh()
    },
  })

  const updateTodo = useMutation({
    mutationFn: (input: { id: string; patch: todoApi.UpdateTodoInput }) => todoApi.updateTodo(input.id, input.patch),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ['todo'] })
      const previous = queryClient.getQueriesData<todoApi.TodoItem[]>({ queryKey: ['todo'] })
      queryClient.setQueriesData<todoApi.TodoItem[]>({ queryKey: ['todo'] }, (items = []) =>
        items.map((item) => item.id === input.id ? { ...item, ...input.patch } : item),
      )
      return { previous }
    },
    onError: (_error, _input, context) => {
      for (const [key, value] of context?.previous ?? []) {
        queryClient.setQueryData(key, value)
      }
    },
    onSettled: async () => {
      await refresh()
    },
  })

  const deleteTodo = useMutation({
    mutationFn: todoApi.deleteTodo,
    onSuccess: async () => {
      await refresh()
    },
  })

  function submitTask(event: FormEvent) {
    event.preventDefault()
    if (!title.trim()) return
    createTodo.mutate({ title, date: selectedDate, note: note.trim() ? note : null })
  }

  function handleMarkAllDone() {
    for (const item of openTasks) {
      updateTodo.mutate({ id: item.id, patch: { isCompleted: true } })
    }
  }

  return (
    <AppShell title="Todo" description="Plan the day, then finish the work that matters.">
        <div className="todo-content-v2">
          {/* Hero Header */}
          <div className="todo-hero-v2">
            <div className="todo-hero-v2__info">
              <h2 className="todo-hero-v2__title">TODO LIST</h2>
            </div>
            <div className="todo-hero-v2__date-card">
              <div className="todo-hero-v2__date-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div>
                <p className="todo-hero-v2__date-label">{formatDay(selectedDate)}</p>
                <input
                  className="todo-hero-v2__date-input"
                  aria-label="Selected todo date"
                  value={selectedDate}
                  type="date"
                  onChange={(event) => setSelectedDate(event.target.value)}
                />
              </div>
            </div>
          </div>

          {/* View Switch */}
          <div className="todo-view-switch" aria-label="Todo view">
            <button
              className={view === 'day' ? 'todo-view-switch__button todo-view-switch__button--active' : 'todo-view-switch__button'}
              type="button"
              onClick={() => setView('day')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="3" y1="15" x2="21" y2="15" />
              </svg>
              Day
            </button>
            <button
              className={view === 'week' ? 'todo-view-switch__button todo-view-switch__button--active' : 'todo-view-switch__button'}
              type="button"
              onClick={() => setView('week')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              Week
            </button>
          </div>



          {/* New Task Form */}
          <div className="todo-bento-grid">
            <form className="todo-create-v2" onSubmit={submitTask}>
              <h3 className="todo-create-v2__title">New Task</h3>
              <div className="todo-create-v2__fields">
                <div className="todo-create-v2__field todo-create-v2__field--primary">
                  <label className="todo-create-v2__label">Task Name</label>
                  <input
                    className="todo-create-v2__input"
                    data-testid="todo-title-input"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="e.g. Review IELTS Unit 3"
                  />
                </div>
                <div className="todo-create-v2__field">
                  <label className="todo-create-v2__label">Note (Optional)</label>
                  <input
                    className="todo-create-v2__input"
                    data-testid="todo-note-input"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Details..."
                  />
                </div>
              </div>
              <button className="todo-create-v2__submit" type="submit" disabled={createTodo.isPending || !title.trim()} data-testid="create-todo-button">
                {createTodo.isPending ? (
                  <svg className="todo-spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" strokeDasharray="31.4 31.4" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                )}
                Add task
              </button>
            </form>
          </div>

          {/* Loading / Error States */}
          {view === 'day' && todosQuery.isLoading ? <p className="flashcard-status">Loading tasks...</p> : null}
          {view === 'week' && weekQuery.isLoading ? <p className="flashcard-status">Loading week...</p> : null}
          {(view === 'day' && todosQuery.isError) || (view === 'week' && weekQuery.isError) ? <p className="flashcard-status flashcard-status--error">Could not load Todo tasks.</p> : null}

          {/* Day View — Task List */}
          {view === 'day' && !todosQuery.isLoading && !todosQuery.isError ? (
            <section className="todo-tasks-v2" aria-label="Todo tasks">
              {todos.length === 0 ? (
                <div className="empty-panel todo-empty">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <h2>No tasks for this day</h2>
                  <p>Add one small task and give the day a handle.</p>
                </div>
              ) : null}

              {/* ── Active Tasks (Collapsible) ── */}
              {openTasks.length > 0 && (
                <div className="todo-section-v2">
                  <div className="todo-tasks-v2__header">
                    <button
                      className="todo-section-v2__toggle"
                      type="button"
                      onClick={() => setActiveExpanded((prev) => !prev)}
                      aria-expanded={activeExpanded}
                    >
                      <svg
                        className={`todo-section-v2__chevron${activeExpanded ? ' todo-section-v2__chevron--open' : ''}`}
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                      <h4 className="todo-section-v2__heading">
                        Active Tasks
                        <span className="todo-tasks-v2__count">{openTasks.length}</span>
                      </h4>
                    </button>
                    <button
                      className="todo-tasks-v2__mark-all"
                      type="button"
                      onClick={handleMarkAllDone}
                    >
                      Mark all as done
                    </button>
                  </div>

                  {activeExpanded && (
                    <div className="todo-section-v2__list">
                      {openTasks.map((item) => (
                        <article className="todo-card-v2" key={item.id}>
                          <div className="todo-card-v2__checkbox">
                            <input
                              aria-label={`Complete ${item.title}`}
                              checked={item.isCompleted}
                              type="checkbox"
                              onChange={(event) => updateTodo.mutate({ id: item.id, patch: { isCompleted: event.target.checked } })}
                            />
                          </div>
                          <div className="todo-card-v2__body">
                            <div className="todo-card-v2__title-row">
                              <h5 className="todo-card-v2__title">{item.title}</h5>
                            </div>
                            {item.note ? <p className="todo-card-v2__note">{item.note}</p> : null}
                          </div>
                          <div className="todo-card-v2__actions">
                            <button
                              className="todo-card-v2__action todo-card-v2__action--delete"
                              type="button"
                              aria-label={`Delete ${item.title}`}
                              onClick={() => deleteTodo.mutate(item.id)}
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Completed Tasks (Collapsible) ── */}
              {completedTasks.length > 0 && (
                <div className="todo-section-v2 todo-section-v2--completed">
                  <button
                    className="todo-section-v2__toggle"
                    type="button"
                    onClick={() => setCompletedExpanded((prev) => !prev)}
                    aria-expanded={completedExpanded}
                  >
                    <svg
                      className={`todo-section-v2__chevron${completedExpanded ? ' todo-section-v2__chevron--open' : ''}`}
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                    <h4 className="todo-section-v2__heading">
                      Completed
                      <span className="todo-tasks-v2__count">{completedTasks.length}</span>
                    </h4>
                  </button>

                  {completedExpanded && (
                    <div className="todo-section-v2__list">
                      {completedTasks.map((item) => (
                        <article className="todo-card-v2 todo-card-v2--completed" key={item.id}>
                          <div className="todo-card-v2__checkbox">
                            <input
                              aria-label={`Uncomplete ${item.title}`}
                              checked={item.isCompleted}
                              type="checkbox"
                              onChange={(event) => updateTodo.mutate({ id: item.id, patch: { isCompleted: event.target.checked } })}
                            />
                          </div>
                          <div className="todo-card-v2__body">
                            <h5 className="todo-card-v2__title todo-card-v2__title--done">{item.title}</h5>
                            {item.note ? <p className="todo-card-v2__note">{item.note}</p> : null}
                          </div>
                          <div className="todo-card-v2__actions">
                            <button
                              className="todo-card-v2__action todo-card-v2__action--delete"
                              type="button"
                              aria-label={`Delete ${item.title}`}
                              onClick={() => deleteTodo.mutate(item.id)}
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>
          ) : null}

          {/* Week View */}
          {view === 'week' && !weekQuery.isLoading && !weekQuery.isError ? (
            <TodoWeekView
              dates={dates}
              items={weekTodos}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onToggle={(item, isCompleted) => updateTodo.mutate({ id: item.id, patch: { isCompleted } })}
              onDelete={(item) => deleteTodo.mutate(item.id)}
              onMove={(item, date, sortOrder) => updateTodo.mutate({ id: item.id, patch: { date, sortOrder } })}
            />
          ) : null}
        </div>
    </AppShell>
  )
}
