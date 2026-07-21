import { type FormEvent, useCallback, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { toast } from '@/lib/toast'
import * as todoApi from '../api/todo.api'
import { DeleteTodoConfirmationDialog } from '../components/DeleteTodoConfirmationDialog'
import { MyDayView } from '../components/MyDayView'
import { TodoDetailsPanel } from '../components/TodoDetailsPanel'
import { TodoPageHeader } from '../components/TodoPageHeader'
import { formatMyDayDate, shiftDate, toDateInput, weekDates } from '../todo-date'
import { readTodoSortMode, writeTodoSortMode, type TodoSortMode } from '../todo-sort'
import { TodoWeekView } from './TodoWeekView'
import '../todo.css'

type TodoView = 'my-day' | 'week'

type CreateVariables = {
  input: todoApi.CreateTodoInput
  selectAfterCreate: boolean
}

function WeekQuickAdd({ date, pending, onCreate }: { date: string; pending: boolean; onCreate: (title: string) => Promise<boolean> }) {
  const [title, setTitle] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    const normalized = title.trim()
    if (!normalized) return
    if (await onCreate(normalized)) setTitle('')
  }

  return (
    <form className="todo-quick-add" onSubmit={submit}>
      <Plus aria-hidden="true" />
      <label className="sr-only" htmlFor="todo-week-quick-title">Add a task for {date}</label>
      <input
        id="todo-week-quick-title"
        value={title}
        maxLength={240}
        autoComplete="off"
        placeholder={`Add a task for ${date}`}
        onChange={(event) => setTitle(event.target.value)}
      />
      <button type="submit" disabled={pending || !title.trim()}>{pending ? 'Adding...' : 'Add'}</button>
    </form>
  )
}

export function TodoPage() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTaskId = searchParams.get('taskId')
  const today = useMemo(() => toDateInput(new Date()), [])
  const [view, setView] = useState<TodoView>('my-day')
  const activeView: TodoView = requestedTaskId ? 'my-day' : view
  const [weekAnchor, setWeekAnchor] = useState(today)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<todoApi.TodoItem | null>(null)
  const [sortMode, setSortMode] = useState<TodoSortMode | null>(() => readTodoSortMode())
  const orderQueue = useRef<Promise<void>>(Promise.resolve())

  const dates = useMemo(() => weekDates(weekAnchor), [weekAnchor])
  const dayKey = ['todo', 'items', today] as const
  const weekKey = ['todo', 'range', dates[0], dates[6]] as const

  const todosQuery = useQuery({
    queryKey: dayKey,
    queryFn: () => todoApi.listByDate(today),
    enabled: activeView === 'my-day',
  })

  const weekQuery = useQuery({
    queryKey: weekKey,
    queryFn: () => todoApi.listByRange(dates[0], dates[6]),
    enabled: activeView === 'week',
  })

  const requestedTaskQuery = useQuery({
    queryKey: ['todo-item', requestedTaskId],
    queryFn: () => todoApi.getTodo(requestedTaskId!),
    enabled: Boolean(requestedTaskId),
    retry: false,
  })

  const todos = useMemo(() => todosQuery.data ?? [], [todosQuery.data])
  const weekTodos = useMemo(() => weekQuery.data ?? [], [weekQuery.data])
  const effectiveSelectedTaskId = requestedTaskQuery.data?.id ?? selectedTaskId
  const selectedTask = todos.find((item) => item.id === effectiveSelectedTaskId)
    ?? weekTodos.find((item) => item.id === effectiveSelectedTaskId)
    ?? (requestedTaskQuery.data?.id === effectiveSelectedTaskId ? requestedTaskQuery.data : null)

  const refresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['todo'] }),
      queryClient.invalidateQueries({ queryKey: ['todo-item'] }),
    ])
  }, [queryClient])

  const createTodo = useMutation({
    mutationFn: ({ input }: CreateVariables) => todoApi.createTodo(input),
    onSuccess: async (created, variables) => {
      const appendCreated = (items: todoApi.TodoItem[] = []) =>
        items.some((item) => item.id === created.id) ? items : [...items, created]
      if (created.date === today) queryClient.setQueryData<todoApi.TodoItem[]>(dayKey, appendCreated)
      if (dates.includes(created.date)) queryClient.setQueryData<todoApi.TodoItem[]>(weekKey, appendCreated)
      if (variables.selectAfterCreate) setSelectedTaskId(created.id)
      await refresh()
    },
    onError: () => toast.error('Could not create the task.'),
  })

  const updateTodo = useMutation({
    mutationFn: (variables: { id: string; patch: todoApi.UpdateTodoInput }) => todoApi.updateTodo(variables.id, variables.patch),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['todo'] })
      const previous = queryClient.getQueriesData<todoApi.TodoItem[]>({ queryKey: ['todo'] })
      queryClient.setQueriesData<todoApi.TodoItem[]>({ queryKey: ['todo'] }, (items = []) =>
        items.map((item) => item.id === variables.id ? { ...item, ...variables.patch } : item),
      )
      return { previous }
    },
    onSuccess: (updated) => {
      queryClient.setQueriesData<todoApi.TodoItem[]>({ queryKey: ['todo'] }, (items = []) =>
        items.map((item) => item.id === updated.id ? updated : item),
      )
      queryClient.setQueryData(['todo-item', updated.id], updated)
      if (updated.warningCode === 'recurrence-next-retained') {
        toast.warning('The edited next occurrence was kept. Both tasks now exist.')
      } else if (updated.warningCode === 'reminder-cleared-after-date-change') {
        toast.warning('The task moved, but its reminder was cleared because that time is already past.')
      }
    },
    onError: (_error, _variables, context) => {
      for (const [key, value] of context?.previous ?? []) queryClient.setQueryData(key, value)
      toast.error('Could not save the task changes.')
    },
    onSettled: refresh,
  })

  const deleteTodo = useMutation({
    mutationFn: todoApi.deleteTodo,
    onSuccess: async (_result, deletedId) => {
      queryClient.setQueriesData<todoApi.TodoItem[]>({ queryKey: ['todo'] }, (items = []) =>
        items.filter((item) => item.id !== deletedId),
      )
      if (selectedTaskId === deletedId) setSelectedTaskId(null)
      queryClient.removeQueries({ queryKey: ['todo-item', deletedId] })
      setDeleteTarget(null)
      await refresh()
    },
    onError: () => toast.error('Could not delete the task.'),
  })

  async function createTask(title: string, date: string, selectAfterCreate: boolean) {
    try {
      await createTodo.mutateAsync({ input: { title, date }, selectAfterCreate })
      return true
    } catch {
      return false
    }
  }

  async function updateTask(id: string, patch: todoApi.UpdateTodoInput) {
    await updateTodo.mutateAsync({ id, patch })
  }

  function safelyUpdateTask(item: todoApi.TodoItem, patch: todoApi.UpdateTodoInput) {
    void updateTask(item.id, patch).catch(() => undefined)
  }

  function changeSortMode(mode: TodoSortMode | null) {
    setSortMode(mode)
    writeTodoSortMode(mode)
  }

  function setOptimisticOrder(orderedIds: string[]) {
    const sortOrder = new Map(orderedIds.map((id, index) => [id, index]))
    queryClient.setQueryData<todoApi.TodoItem[]>(dayKey, (items = []) =>
      items.map((item) => sortOrder.has(item.id) ? { ...item, sortOrder: sortOrder.get(item.id)! } : item),
    )
  }

  function persistManualOrder(orderedIds: string[], disableSort: boolean) {
    if (disableSort || sortMode) changeSortMode(null)
    setOptimisticOrder(orderedIds)
    orderQueue.current = orderQueue.current
      .then(async () => {
        for (const [sortOrder, id] of orderedIds.entries()) {
          await todoApi.updateTodo(id, { sortOrder })
        }
      })
      .then(refresh)
      .catch(async () => {
        toast.error('Could not save the manual task order.')
        await refresh()
      })
  }

  function changeView(nextView: TodoView) {
    setView(nextView)
    setSelectedTaskId(null)
    if (requestedTaskId) {
      const next = new URLSearchParams(searchParams)
      next.delete('taskId')
      setSearchParams(next, { replace: true })
    }
  }

  function closeDetails() {
    setSelectedTaskId(null)
    if (requestedTaskId) {
      const next = new URLSearchParams(searchParams)
      next.delete('taskId')
      setSearchParams(next, { replace: true })
    }
  }

  return (
    <div className="todo-workspace-page">
      <TodoPageHeader
        view={activeView}
        subtitle={activeView === 'my-day' ? formatMyDayDate(today) : undefined}
        sortMode={sortMode}
        onSortChange={changeSortMode}
        onViewChange={changeView}
        onShiftWeek={(days) => setWeekAnchor((current) => shiftDate(current, days))}
      />

      {activeView === 'my-day' ? (
        <main className={`todo-main-layout${selectedTask ? ' todo-main-layout--details' : ''}`}>
          <MyDayView
            items={todos}
            selectedId={effectiveSelectedTaskId}
            sortMode={sortMode}
            loading={todosQuery.isLoading}
            error={todosQuery.isError}
            creating={createTodo.isPending}
            onCreate={(title) => createTask(title, today, true)}
            onSelect={(item) => setSelectedTaskId(item.id)}
            onToggle={(item) => safelyUpdateTask(item, { isCompleted: !item.isCompleted })}
            onToggleImportant={(item) => safelyUpdateTask(item, { isImportant: !item.isImportant })}
            onDelete={setDeleteTarget}
            onPersistOrder={persistManualOrder}
          />
          {requestedTaskId && requestedTaskQuery.isLoading ? (
            <p className="todo-my-day__status" role="status">Opening task...</p>
          ) : null}
          {requestedTaskId && requestedTaskQuery.isError ? (
            <p className="todo-my-day__status todo-my-day__status--error" role="alert">
              This task is unavailable or no longer exists.
            </p>
          ) : null}
          {selectedTask ? (
            <TodoDetailsPanel
              key={selectedTask.id}
              item={selectedTask}
              pending={updateTodo.isPending}
              onClose={closeDetails}
              onUpdate={updateTask}
              onDelete={setDeleteTarget}
            />
          ) : null}
        </main>
      ) : (
        <main className="todo-main-layout">
          <WeekQuickAdd
            date={weekAnchor}
            pending={createTodo.isPending}
            onCreate={(title) => createTask(title, weekAnchor, false)}
          />
          {weekQuery.isLoading ? <p className="todo-my-day__status" role="status">Loading week...</p> : null}
          {weekQuery.isError ? <p className="todo-my-day__status todo-my-day__status--error" role="alert">Could not load Todo week.</p> : null}
          {!weekQuery.isLoading && !weekQuery.isError ? (
            <div className="todo-week-surface">
              <TodoWeekView
                dates={dates}
                items={weekTodos}
                selectedDate={weekAnchor}
                onSelectDate={setWeekAnchor}
                onToggle={(item, isCompleted) => safelyUpdateTask(item, { isCompleted })}
                onDelete={setDeleteTarget}
                onMove={(item, date, sortOrder) => safelyUpdateTask(item, { date, sortOrder })}
              />
            </div>
          ) : null}
        </main>
      )}

      {deleteTarget ? (
        <DeleteTodoConfirmationDialog
          title={deleteTarget.title}
          pending={deleteTodo.isPending}
          onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
          onConfirm={() => deleteTodo.mutate(deleteTarget.id)}
        />
      ) : null}
    </div>
  )
}
