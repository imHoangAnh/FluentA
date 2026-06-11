import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, Home, LayoutGrid, List, Loader2, Plus, Trash2 } from 'lucide-react'
import { type FormEvent, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import * as todoApi from '../../lib/api/todo.api'
import { TodoWeekView } from './TodoWeekView'

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
    month: 'long',
    day: 'numeric',
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
    () => (todosQuery.data ?? []).toSorted((left, right) => left.sortOrder - right.sortOrder || left.createdAt.localeCompare(right.createdAt)),
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

  const updateLayout = useMutation({
    mutationFn: (input: { items: todoApi.TodoItem[]; updates: Array<{ id: string; date: string; sortOrder: number }> }) =>
      todoApi.updateTodoLayout(input.updates),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: weekKey })
      const previous = queryClient.getQueryData<todoApi.TodoItem[]>(weekKey)
      queryClient.setQueryData(weekKey, input.items)
      return { previous }
    },
    onError: (_error, _input, context) => {
      queryClient.setQueryData(weekKey, context?.previous)
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

  return (
    <main className="workspace todo-workspace">
      <header className="workspace-header">
        <div className="brand-inline">
          <span className="brand-mark brand-mark--small">FA</span>
          <strong>FluentA</strong>
        </div>
        <nav className="workspace-nav" aria-label="Todo navigation">
          <Link className="ghost-button ghost-button--inline" to="/">
            <Home size={17} /> Vocabulary
          </Link>
        </nav>
      </header>

      <section className="todo-shell">
        <div className="todo-hero">
          <div>
            <span className="preview-label">Todo List</span>
            <h1>{view === 'day' ? 'Daily plan' : 'Week plan'}</h1>
            <p>{openTasks.length} open tasks · {completedTasks.length} completed</p>
          </div>
          <div className="todo-date-card">
            <CalendarDays size={22} />
            <strong>{formatDay(selectedDate)}</strong>
            <input
              aria-label="Selected todo date"
              value={selectedDate}
              type="date"
              onChange={(event) => setSelectedDate(event.target.value)}
            />
          </div>
        </div>

        <div className="todo-view-switch" aria-label="Todo view">
          <button className={view === 'day' ? 'todo-view-switch__button todo-view-switch__button--active' : 'todo-view-switch__button'} type="button" onClick={() => setView('day')}>
            <List size={16} /> Day
          </button>
          <button className={view === 'week' ? 'todo-view-switch__button todo-view-switch__button--active' : 'todo-view-switch__button'} type="button" onClick={() => setView('week')}>
            <LayoutGrid size={16} /> Week
          </button>
        </div>

        <div className="todo-day-controls" aria-label="Todo day controls">
          <button className="ghost-button ghost-button--inline" type="button" onClick={() => setSelectedDate((date) => shiftDate(date, view === 'day' ? -1 : -7))}>
            <ArrowLeft size={17} /> Previous
          </button>
          <button className="ghost-button ghost-button--inline" type="button" onClick={() => setSelectedDate(toDateInput(new Date()))}>
            Today
          </button>
          <button className="ghost-button ghost-button--inline" type="button" onClick={() => setSelectedDate((date) => shiftDate(date, view === 'day' ? 1 : 7))}>
            Next <ArrowRight size={17} />
          </button>
        </div>

        <form className="todo-create" onSubmit={submitTask}>
          <label>
            Task
            <input
              data-testid="todo-title-input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Review IELTS Unit 3"
            />
          </label>
          <label>
            Note
            <input
              data-testid="todo-note-input"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Optional details"
            />
          </label>
          <button className="primary-button" type="submit" disabled={createTodo.isPending || !title.trim()} data-testid="create-todo-button">
            {createTodo.isPending ? <Loader2 size={18} /> : <Plus size={18} />} Add task
          </button>
        </form>

        {view === 'day' && todosQuery.isLoading ? <p className="flashcard-status">Loading tasks...</p> : null}
        {view === 'week' && weekQuery.isLoading ? <p className="flashcard-status">Loading week...</p> : null}
        {(view === 'day' && todosQuery.isError) || (view === 'week' && weekQuery.isError) ? <p className="flashcard-status flashcard-status--error">Could not load Todo tasks.</p> : null}

        {view === 'day' && !todosQuery.isLoading && !todosQuery.isError ? (
          <section className="todo-list" aria-label="Todo tasks">
            {todos.length === 0 ? (
              <div className="empty-panel todo-empty">
                <CheckCircle2 size={28} />
                <h2>No tasks for this day</h2>
                <p>Add one small task and give the day a handle.</p>
              </div>
            ) : null}

            {todos.map((item) => (
              <article className={item.isCompleted ? 'todo-item todo-item--completed' : 'todo-item'} key={item.id}>
                <label className="todo-check">
                  <input
                    aria-label={`Complete ${item.title}`}
                    checked={item.isCompleted}
                    type="checkbox"
                    onChange={(event) => updateTodo.mutate({ id: item.id, patch: { isCompleted: event.target.checked } })}
                  />
                  <span>{item.title}</span>
                </label>
                {item.note ? <p>{item.note}</p> : null}
                <footer>
                  {item.isCarriedOver && item.originalDate ? <span className="todo-badge">Carried over from {item.originalDate}</span> : null}
                  <button
                    className="icon-button icon-button--danger"
                    type="button"
                    aria-label={`Delete ${item.title}`}
                    onClick={() => deleteTodo.mutate(item.id)}
                  >
                    <Trash2 size={17} />
                  </button>
                </footer>
              </article>
            ))}
          </section>
        ) : null}

        {view === 'week' && !weekQuery.isLoading && !weekQuery.isError ? (
          <TodoWeekView
            dates={dates}
            items={weekTodos}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onLayoutChange={(items, updates) => updateLayout.mutate({ items, updates })}
            onToggle={(item, isCompleted) => updateTodo.mutate({ id: item.id, patch: { isCompleted } })}
            onDelete={(item) => deleteTodo.mutate(item.id)}
          />
        ) : null}
      </section>
    </main>
  )
}
