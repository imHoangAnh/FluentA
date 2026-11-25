import { useCallback, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { toast } from '@/shared/lib/toast'
import { todayUtc } from '@/shared/lib/date'
import {
  AlertDialog,
  AlertDialogActionButton,
  AlertDialogCancelButton,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog'
import * as todoApi from '../api/todo.api'
import { todoKeys } from '../api/todo.queries'
import { MyDayView } from '../components/MyDayView'
import { TodoDetailsPanel } from '../components/TodoDetailsPanel'
import { TodoSidebar } from '../components/TodoSidebar'
import { shiftDate, weekDates } from '../model/todo-date'
import { TodoWeekView } from './TodoWeekView'
import '../todo.css'

type TodoView = 'my-day' | 'week'

type CreateVariables = {
  input: todoApi.CreateTodoInput
  selectAfterCreate: boolean
}

export function TodoPage() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTaskId = searchParams.get('taskId')
  const today = useMemo(() => todayUtc(), [])
  const [view, setView] = useState<TodoView>('my-day')
  const activeView: TodoView = requestedTaskId ? 'my-day' : view
  const [weekAnchor, setWeekAnchor] = useState(today)
  const [selectedWeekDate, setSelectedWeekDate] = useState(today)
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null)
  const [selectedPriorityId, setSelectedPriorityId] = useState<string | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [deletingTask, setDeletingTask] = useState<todoApi.TodoItem | null>(null)
  const orderQueue = useRef<Promise<void>>(Promise.resolve())

  const dates = useMemo(() => weekDates(weekAnchor), [weekAnchor])
  const currentWeekDates = useMemo(() => weekDates(today), [today])
  const dayKey = todoKeys.day(today)
  const weekKey = todoKeys.range(dates[0], dates[6])
  const currentWeekKey = todoKeys.range(currentWeekDates[0], currentWeekDates[6])

  const todosQuery = useQuery({
    queryKey: dayKey,
    queryFn: () => todoApi.listByDate(today),
  })

  const weekQuery = useQuery({
    queryKey: weekKey,
    queryFn: () => todoApi.listByRange(dates[0], dates[6]),
  })

  const prioritiesQuery = useQuery({
    queryKey: todoKeys.priorities,
    queryFn: todoApi.listPriorities,
  })

  const tagsQuery = useQuery({
    queryKey: todoKeys.tags,
    queryFn: todoApi.listTags,
  })

  const requestedTaskQuery = useQuery({
    queryKey: todoKeys.item(requestedTaskId),
    queryFn: () => todoApi.getTodo(requestedTaskId!),
    enabled: Boolean(requestedTaskId),
    retry: false,
  })

  const todos = useMemo(() => todosQuery.data ?? [], [todosQuery.data])
  const weekTodos = useMemo(() => weekQuery.data ?? [], [weekQuery.data])
  const priorities = useMemo(() => prioritiesQuery.data ?? [], [prioritiesQuery.data])
  const tags = useMemo(() => tagsQuery.data ?? [], [tagsQuery.data])

  const effectiveSelectedTaskId = requestedTaskQuery.data?.id ?? selectedTaskId
  const selectedTask = todos.find((item) => item.id === effectiveSelectedTaskId)
    ?? weekTodos.find((item) => item.id === effectiveSelectedTaskId)
    ?? (requestedTaskQuery.data?.id === effectiveSelectedTaskId ? requestedTaskQuery.data : null)

  const refreshAll = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: todoKeys.all }),
      queryClient.invalidateQueries({ queryKey: todoKeys.items }),
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
      await refreshAll()
    },
    onError: () => toast.error('Could not create the task.'),
  })

  const updateTodo = useMutation({
    mutationFn: (variables: { id: string; patch: todoApi.UpdateTodoInput }) =>
      todoApi.updateTodo(variables.id, variables.patch),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: todoKeys.all })
      const previous = queryClient.getQueriesData<todoApi.TodoItem[]>({ queryKey: todoKeys.all })
      queryClient.setQueriesData<todoApi.TodoItem[]>({ queryKey: todoKeys.all }, (items = []) =>
        items.map((item) => (item.id === variables.id ? { ...item, ...variables.patch } : item)),
      )
      return { previous }
    },
    onSuccess: (updated) => {
      queryClient.setQueriesData<todoApi.TodoItem[]>({ queryKey: todoKeys.all }, (items = []) =>
        items.map((item) => (item.id === updated.id ? updated : item)),
      )
      queryClient.setQueryData(todoKeys.item(updated.id), updated)
      if (updated.warningCode === 'recurrence-next-retained') {
        toast.warning('The edited next occurrence was kept. Both tasks now exist.')
      }
    },
    onError: (_error, _variables, context) => {
      for (const [key, value] of context?.previous ?? []) queryClient.setQueryData(key, value)
      toast.error('Could not save the task changes.')
    },
    onSettled: refreshAll,
  })

  const duplicateTodo = useMutation({
    mutationFn: (item: todoApi.TodoItem) => todoApi.duplicateTodo(item.id),
    onSuccess: async (created) => {
      const appendCreated = (items: todoApi.TodoItem[] = []) =>
        items.some((item) => item.id === created.id) ? items : [...items, created]
      if (created.date === today) queryClient.setQueryData<todoApi.TodoItem[]>(dayKey, appendCreated)
      if (dates.includes(created.date)) queryClient.setQueryData<todoApi.TodoItem[]>(weekKey, appendCreated)
      await refreshAll()
    },
    onError: () => toast.error('Could not duplicate the task.'),
  })

  const deleteTodo = useMutation({
    mutationFn: todoApi.deleteTodo,
    onSuccess: async (_result, deletedId) => {
      queryClient.setQueriesData<todoApi.TodoItem[]>({ queryKey: todoKeys.all }, (items = []) =>
        items.filter((item) => item.id !== deletedId),
      )
      if (selectedTaskId === deletedId) setSelectedTaskId(null)
      queryClient.removeQueries({ queryKey: todoKeys.item(deletedId) })
      setDeletingTask(null)
      await refreshAll()
      toast.success('Task deleted.')
    },
    onError: () => toast.error('Could not delete the task.'),
  })

  const createTagMutation = useMutation({
    mutationFn: (name: string) => todoApi.createTag(name),
    onSuccess: (created) => {
      queryClient.setQueryData<todoApi.TodoTag[]>(todoKeys.tags, (current = []) =>
        current.some((tag) => tag.id === created.id) ? current : [...current, created],
      )
    },
    onError: () => toast.error('Could not create the tag.'),
  })

  const deleteTagMutation = useMutation({
    mutationFn: (id: string) => todoApi.deleteTag(id),
    onSuccess: async (_result, tagId) => {
      if (selectedTagId === tagId) setSelectedTagId(null)
      queryClient.setQueryData<todoApi.TodoTag[]>(todoKeys.tags, (current = []) =>
        current.filter((tag) => tag.id !== tagId),
      )
      await refreshAll()
    },
    onError: () => toast.error('Could not delete the tag.'),
  })

  const createPriorityMutation = useMutation({
    mutationFn: (input: todoApi.CreatePriorityInput) => todoApi.createPriority(input),
    onSuccess: (created) => {
      queryClient.setQueryData<todoApi.TodoPriority[]>(todoKeys.priorities, (current = []) =>
        current.some((priority) => priority.id === created.id) ? current : [...current, created],
      )
    },
    onError: () => toast.error('Could not create the priority.'),
  })

  const deletePriorityMutation = useMutation({
    mutationFn: (id: string) => todoApi.deletePriority(id),
    onSuccess: async (_result, priorityId) => {
      if (selectedPriorityId === priorityId) setSelectedPriorityId(null)
      queryClient.setQueryData<todoApi.TodoPriority[]>(todoKeys.priorities, (current = []) =>
        current.filter((priority) => priority.id !== priorityId),
      )
      await refreshAll()
    },
    onError: () => toast.error('Could not delete the priority.'),
  })

  const createSubtaskMutation = useMutation({
    mutationFn: ({ todoId, title }: { todoId: string; title: string }) => todoApi.createSubtask(todoId, title),
    onSuccess: async () => {
      await refreshAll()
    },
    onError: () => toast.error('Could not add subtask.'),
  })

  const updateSubtaskMutation = useMutation({
    mutationFn: ({ todoId, subtaskId, isCompleted }: { todoId: string; subtaskId: string; isCompleted: boolean }) =>
      todoApi.updateSubtask(todoId, subtaskId, { isCompleted }),
    onSuccess: async () => {
      await refreshAll()
    },
    onError: () => toast.error('Could not update subtask.'),
  })

  const deleteSubtaskMutation = useMutation({
    mutationFn: ({ todoId, subtaskId }: { todoId: string; subtaskId: string }) =>
      todoApi.deleteSubtask(todoId, subtaskId),
    onSuccess: async () => {
      await refreshAll()
    },
    onError: () => toast.error('Could not delete subtask.'),
  })

  async function createTask(title: string, date: string, selectAfterCreate: boolean) {
    try {
      await createTodo.mutateAsync({
        input: {
          title,
          date,
          priorityId: selectedPriorityId ?? undefined,
          tagIds: selectedTagId ? [selectedTagId] : undefined,
        },
        selectAfterCreate,
      })
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

  function persistManualOrder(orderedIds: string[]) {
    const sortOrder = new Map(orderedIds.map((id, index) => [id, index]))
    queryClient.setQueryData<todoApi.TodoItem[]>(dayKey, (items = []) =>
      items.map((item) => (sortOrder.has(item.id) ? { ...item, sortOrder: sortOrder.get(item.id)! } : item)),
    )
    orderQueue.current = orderQueue.current
      .then(async () => {
        for (const [index, id] of orderedIds.entries()) {
          await todoApi.updateTodo(id, { sortOrder: index })
        }
      })
      .then(refreshAll)
      .catch(async () => {
        toast.error('Could not save the manual task order.')
        await refreshAll()
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

  function shiftWeek(days: number) {
    const nextAnchor = shiftDate(weekAnchor, days)
    const nextDates = weekDates(nextAnchor)
    setSelectedTaskId(null)
    setWeekAnchor(nextAnchor)
    setSelectedWeekDate(nextDates.includes(today) ? today : nextDates[0])
  }

  function jumpToThisWeek() {
    setSelectedTaskId(null)
    setWeekAnchor(today)
    setSelectedWeekDate(today)
  }

  const filterItem = useCallback(
    (item: todoApi.TodoItem) => {
      if (selectedTagId && !(item.tags ?? []).some((tag) => tag.id === selectedTagId)) {
        return false
      }
      if (selectedPriorityId && item.priorityId !== selectedPriorityId) {
        return false
      }
      return true
    },
    [selectedPriorityId, selectedTagId],
  )

  const filteredDayTodos = useMemo(() => todos.filter(filterItem), [todos, filterItem])
  const filteredWeekTodos = useMemo(() => weekTodos.filter(filterItem), [weekTodos, filterItem])

  const myDayActiveCount = useMemo(() => todos.filter((item) => !item.isCompleted).length, [todos])
  const currentWeekTodos = queryClient.getQueryData<todoApi.TodoItem[]>(currentWeekKey) ?? weekTodos
  const weekActiveCount = useMemo(
    () => currentWeekTodos.filter((item) => !item.isCompleted).length,
    [currentWeekTodos],
  )

  const activeFilterParts: string[] = []
  const selectedTag = tags.find((tag) => tag.id === selectedTagId)
  const selectedPriority = priorities.find((priority) => priority.id === selectedPriorityId)
  if (selectedTag) activeFilterParts.push(`#${selectedTag.name}`)
  if (selectedPriority) activeFilterParts.push(selectedPriority.name)
  const activeFilterLabel = activeFilterParts.length > 0 ? activeFilterParts.join(' + ') : null

  return (
    <div className={`todo-workspace-shell${selectedTask ? ' todo-workspace-shell--with-details' : ''}`}>
      <TodoSidebar
        view={activeView}
        myDayCount={myDayActiveCount}
        weekCount={weekActiveCount}
        tags={tags}
        priorities={priorities}
        selectedTagId={selectedTagId}
        selectedPriorityId={selectedPriorityId}
        onViewChange={changeView}
        onSelectTag={setSelectedTagId}
        onSelectPriority={setSelectedPriorityId}
        onCreateTag={async (name) => {
          try {
            return await createTagMutation.mutateAsync(name)
          } catch {
            return null
          }
        }}
        onDeleteTag={(tagId) => deleteTagMutation.mutate(tagId)}
        onCreatePriority={async (name, tone) => {
          try {
            return await createPriorityMutation.mutateAsync({ name, tone })
          } catch {
            return null
          }
        }}
        onDeletePriority={(priorityId) => deletePriorityMutation.mutate(priorityId)}
      />

      <div className="todo-workspace-main">
        {activeView === 'my-day' ? (
          <>
            <MyDayView
              today={today}
              items={filteredDayTodos}
              selectedId={effectiveSelectedTaskId}
              activeFilterLabel={activeFilterLabel}
              loading={todosQuery.isLoading}
              error={todosQuery.isError}
              creating={createTodo.isPending}
              onClearFilter={() => {
                setSelectedTagId(null)
                setSelectedPriorityId(null)
              }}
              onCreate={(title) => createTask(title, today, true)}
              onSelect={(item) => setSelectedTaskId(item.id)}
              onToggle={(item) => safelyUpdateTask(item, { isCompleted: !item.isCompleted })}
              onDuplicate={(item) => duplicateTodo.mutate(item)}
              onDelete={(item) => setDeletingTask(item)}
              onPersistOrder={persistManualOrder}
            />
            {requestedTaskId && requestedTaskQuery.isLoading ? (
              <p className="todo-status-message" role="status">Opening task...</p>
            ) : null}
            {requestedTaskId && requestedTaskQuery.isError ? (
              <p className="todo-status-message todo-status-message--error" role="alert">
                This task is unavailable or no longer exists.
              </p>
            ) : null}
          </>
        ) : (
          <TodoWeekView
            today={today}
            dates={dates}
            selectedDate={selectedWeekDate}
            items={filteredWeekTodos}
            selectedId={effectiveSelectedTaskId}
            activeFilterLabel={activeFilterLabel}
            loading={weekQuery.isLoading}
            error={weekQuery.isError}
            creating={createTodo.isPending}
            onClearFilter={() => {
              setSelectedTagId(null)
              setSelectedPriorityId(null)
            }}
            onSelectDate={setSelectedWeekDate}
            onShiftWeek={shiftWeek}
            onThisWeek={jumpToThisWeek}
            onCreate={(date, title) => createTask(title, date, false)}
            onSelect={(item) => setSelectedTaskId(item.id)}
            onToggle={(item) => safelyUpdateTask(item, { isCompleted: !item.isCompleted })}
            onDuplicate={(item) => duplicateTodo.mutate(item)}
            onDelete={(item) => setDeletingTask(item)}
            onMove={(item, date, sortOrder) => safelyUpdateTask(item, { date, sortOrder })}
          />
        )}
      </div>

      {selectedTask ? (
        <>
          <div className="todo-sheet-backdrop" aria-hidden="true" onClick={closeDetails} />
          <TodoDetailsPanel
            key={selectedTask.id}
            item={selectedTask}
            today={today}
            priorities={priorities}
            tags={tags}
            pending={updateTodo.isPending}
            suspendEscape={Boolean(deletingTask)}
            onClose={closeDetails}
            onUpdate={updateTask}
            onDelete={(item) => setDeletingTask(item)}
            onCreateTag={async (name) => {
              try {
                return await createTagMutation.mutateAsync(name)
              } catch {
                return null
              }
            }}
            onAddSubtask={async (todoId, title) => {
              try {
                return await createSubtaskMutation.mutateAsync({ todoId, title })
              } catch {
                return null
              }
            }}
            onToggleSubtask={async (todoId, subtask) => {
              await updateSubtaskMutation.mutateAsync({
                todoId,
                subtaskId: subtask.id,
                isCompleted: !subtask.isCompleted,
              }).catch(() => undefined)
            }}
            onDeleteSubtask={async (todoId, subtaskId) => {
              await deleteSubtaskMutation.mutateAsync({ todoId, subtaskId }).catch(() => undefined)
            }}
          />
        </>
      ) : null}

      <AlertDialog open={!!deletingTask} onOpenChange={(open) => { if (!open && !deleteTodo.isPending) setDeletingTask(null) }}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete Task</AlertDialogTitle>
          <AlertDialogDescription>
            Delete <strong>"{deletingTask?.title}"</strong> from your Todo lists? Any future tasks already created from it will also disappear.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancelButton disabled={deleteTodo.isPending}>Cancel</AlertDialogCancelButton>
            <AlertDialogActionButton
              disabled={deleteTodo.isPending}
              onClick={(e) => { e.preventDefault(); if (deletingTask) deleteTodo.mutate(deletingTask.id) }}
            >
              {deleteTodo.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogActionButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
