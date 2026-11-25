import { QueryClient } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AppProviders } from '@/app/providers'
import { todayUtc } from '@/shared/lib/date'
import type {
  CreatePriorityInput,
  CreateTodoInput,
  TodoItem,
  TodoPriority,
  TodoSubtask,
  TodoTag,
  UpdateTodoInput,
} from '../api/todo.api'
import { formatWeekShortRange, weekDates } from '../model/todo-date'
import { TodoPage } from './TodoPage'

const api = vi.hoisted(() => ({
  listByDate: vi.fn(),
  listByRange: vi.fn(),
  getTodo: vi.fn(),
  createTodo: vi.fn(),
  updateTodo: vi.fn(),
  duplicateTodo: vi.fn(),
  deleteTodo: vi.fn(),
  listPriorities: vi.fn(),
  createPriority: vi.fn(),
  updatePriority: vi.fn(),
  deletePriority: vi.fn(),
  listTags: vi.fn(),
  createTag: vi.fn(),
  deleteTag: vi.fn(),
  createSubtask: vi.fn(),
  updateSubtask: vi.fn(),
  deleteSubtask: vi.fn(),
}))

vi.mock('../api/todo.api', async (importOriginal) => ({
  ...await importOriginal<typeof import('../api/todo.api')>(),
  ...api,
}))

let items: TodoItem[]
let priorities: TodoPriority[]
let tags: TodoTag[]

function todo(overrides: Partial<TodoItem> = {}): TodoItem {
  return {
    id: 'todo-1',
    title: 'Review vocabulary',
    note: null,
    date: todayUtc(),
    sortOrder: 0,
    isCompleted: false,
    isImportant: false,
    repeatPattern: null,
    completedAt: null,
    createdAt: '2026-07-22T01:00:00Z',
    updatedAt: '2026-07-22T01:00:00Z',
    priorityId: null,
    priority: null,
    scheduledStartTime: null,
    scheduledEndTime: null,
    estimatedMinutes: null,
    tags: [],
    subtasks: [],
    ...overrides,
  }
}

function renderPage(initialEntry = '/todo') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AppProviders queryClient={queryClient}><TodoPage /></AppProviders>
    </MemoryRouter>,
  )
}

describe('TodoPage My Day & My Week workspace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    priorities = [{ id: 'prio-high', name: 'High', tone: 'warning', sortOrder: 0 }]
    tags = [{ id: 'tag-ielts', name: 'IELTS', }]
    items = [todo()]

    api.listByDate.mockImplementation(async () => [...items])
    api.listByRange.mockImplementation(async () => [...items])
    api.listPriorities.mockImplementation(async () => [...priorities])
    api.listTags.mockImplementation(async () => [...tags])
    api.getTodo.mockImplementation(async (id: string) => items.find((item) => item.id === id) ?? Promise.reject(new Error('not found')))

    api.createTodo.mockImplementation(async (input: CreateTodoInput) => {
      const priority = priorities.find((p) => p.id === input.priorityId) ?? null
      const attachedTags = tags.filter((t) => (input.tagIds ?? []).includes(t.id))
      const created = todo({
        id: `todo-created-${items.length + 1}`,
        title: input.title,
        date: input.date,
        note: input.note ?? null,
        priorityId: priority?.id ?? null,
        priority,
        tags: attachedTags,
      })
      items = [...items, created]
      return created
    })

    api.updateTodo.mockImplementation(async (id: string, patch: UpdateTodoInput) => {
      const existing = items.find((item) => item.id === id)!
      const nextPriority = patch.priorityId !== undefined
        ? (priorities.find((p) => p.id === patch.priorityId) ?? null)
        : existing.priority ?? null
      const nextTags = patch.tagIds !== undefined
        ? tags.filter((t) => patch.tagIds!.includes(t.id))
        : existing.tags ?? []
      const updated: TodoItem = {
        ...existing,
        ...patch,
        priority: nextPriority,
        tags: nextTags,
        updatedAt: '2026-07-22T02:00:00Z',
      }
      items = items.map((item) => (item.id === id ? updated : item))
      return updated
    })

    api.duplicateTodo.mockImplementation(async (id: string) => {
      const source = items.find((item) => item.id === id)!
      const duplicate = todo({
        ...source,
        id: 'todo-duplicate',
        isCompleted: false,
        completedAt: null,
        sortOrder: source.sortOrder + 1,
      })
      items = [...items, duplicate]
      return duplicate
    })

    api.deleteTodo.mockImplementation(async (id: string) => {
      items = items.filter((item) => item.id !== id)
    })

    api.createPriority.mockImplementation(async (input: CreatePriorityInput) => {
      const created: TodoPriority = {
        id: `prio-${priorities.length + 1}`,
        name: input.name,
        tone: input.tone ?? 'warning',
        sortOrder: priorities.length,
      }
      priorities = [...priorities, created]
      return created
    })

    api.deletePriority.mockImplementation(async (id: string) => {
      priorities = priorities.filter((p) => p.id !== id)
      items = items.map((item) => (item.priorityId === id ? { ...item, priorityId: null, priority: null } : item))
    })

    api.createTag.mockImplementation(async (name: string) => {
      const created: TodoTag = { id: `tag-${tags.length + 1}`, name }
      tags = [...tags, created]
      return created
    })

    api.deleteTag.mockImplementation(async (id: string) => {
      tags = tags.filter((t) => t.id !== id)
      items = items.map((item) => ({ ...item, tags: (item.tags ?? []).filter((t) => t.id !== id) }))
    })

    api.createSubtask.mockImplementation(async (todoId: string, title: string) => {
      const existing = items.find((item) => item.id === todoId)!
      const created: TodoSubtask = {
        id: `sub-${(existing.subtasks ?? []).length + 1}`,
        title,
        isCompleted: false,
        sortOrder: (existing.subtasks ?? []).length,
      }
      items = items.map((item) =>
        item.id === todoId ? { ...item, subtasks: [...(item.subtasks ?? []), created] } : item,
      )
      return created
    })

    api.updateSubtask.mockImplementation(async (todoId: string, subtaskId: string, patch: { isCompleted?: boolean }) => {
      let updatedSubtask!: TodoSubtask
      items = items.map((item) => {
        if (item.id !== todoId) return item
        const nextSubtasks = (item.subtasks ?? []).map((subtask) => {
          if (subtask.id !== subtaskId) return subtask
          updatedSubtask = { ...subtask, ...patch }
          return updatedSubtask
        })
        return { ...item, subtasks: nextSubtasks }
      })
      return updatedSubtask
    })

    api.deleteSubtask.mockImplementation(async (todoId: string, subtaskId: string) => {
      items = items.map((item) =>
        item.id === todoId
          ? { ...item, subtasks: (item.subtasks ?? []).filter((subtask) => subtask.id !== subtaskId) }
          : item,
      )
    })
  })

  it('renders My Day sidebar + list and opens details after quick creation', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: 'My Day' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /My Week/ })).toBeInTheDocument()

    const titleInput = screen.getByTestId('todo-title-input')
    fireEvent.change(titleInput, { target: { value: '   ' } })
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled()
    fireEvent.submit(titleInput.closest('form')!)
    expect(api.createTodo).not.toHaveBeenCalled()

    fireEvent.change(titleInput, { target: { value: 'Plan speaking practice' } })
    fireEvent.submit(titleInput.closest('form')!)

    const details = await screen.findByLabelText('Details for Plan speaking practice')
    expect(details).toBeInTheDocument()
    expect(api.createTodo).toHaveBeenCalledWith({
      title: 'Plan speaking practice',
      date: todayUtc(),
      priorityId: undefined,
      tagIds: undefined,
    })
    expect(screen.getByLabelText('Task title')).toHaveFocus()
  })

  it('renders explicit loading, empty, and error feedback', async () => {
    api.listByDate.mockImplementationOnce(() => new Promise(() => undefined))
    const loadingView = renderPage()
    expect(await screen.findByRole('status')).toHaveTextContent('Loading tasks...')
    loadingView.unmount()

    api.listByDate.mockResolvedValueOnce([])
    const emptyView = renderPage()
    expect(await screen.findByRole('heading', { name: 'Your day is clear' })).toBeInTheDocument()
    emptyView.unmount()

    api.listByDate.mockRejectedValueOnce(new Error('offline'))
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load My Day tasks.')
  })

  it('saves Task Details edits explicitly when clicking Save and toggles completion immediately', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Review vocabulary' }))

    expect(screen.queryByLabelText('Task date')).not.toBeInTheDocument()

    const title = screen.getByLabelText('Task title')
    fireEvent.change(title, { target: { value: 'Review lesson 12' } })

    fireEvent.click(screen.getByRole('button', { name: 'Scheduled start time' }))
    fireEvent.click(within(screen.getByRole('listbox', { name: 'Scheduled start time options' })).getByRole('option', { name: '09:00' }))

    fireEvent.click(screen.getByRole('button', { name: 'Scheduled end time' }))
    const endOptions = screen.getByRole('listbox', { name: 'Scheduled end time options' })
    expect(within(endOptions).getByRole('option', { name: '09:00' })).toBeDisabled()
    fireEvent.click(within(endOptions).getByRole('option', { name: '10:30' }))
    expect(screen.queryByText(/Duration:/i)).not.toBeInTheDocument()

    // Shifting start preserves the 1 h 30 min duration
    fireEvent.click(screen.getByRole('button', { name: 'Scheduled start time' }))
    fireEvent.click(within(screen.getByRole('listbox', { name: 'Scheduled start time options' })).getByRole('option', { name: '10:00' }))
    expect(screen.getByRole('button', { name: 'Scheduled end time' })).toHaveTextContent('11:30')

    fireEvent.click(screen.getByRole('button', { name: 'Repeat: Does not repeat' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Monthly' }))

    fireEvent.click(screen.getByRole('button', { name: 'Priority: None' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'High' }))

    fireEvent.click(screen.getByRole('button', { name: 'Edit task tags' }))
    fireEvent.click(within(await screen.findByRole('dialog', { name: 'Select tags' })).getByRole('button', { name: '#IELTS' }))

    const note = screen.getByLabelText('NOTES')
    fireEvent.change(note, { target: { value: 'Focus on the new expressions.' } })

    // Has not saved yet before clicking Save
    expect(api.updateTodo).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(api.updateTodo).toHaveBeenCalledWith('todo-1', {
      title: 'Review lesson 12',
      scheduledStartTime: '10:00',
      scheduledEndTime: '11:30',
      repeatPattern: 'Monthly',
      priorityId: 'prio-high',
      tagIds: ['tag-ielts'],
      note: 'Focus on the new expressions.',
    }))

    // Checkbox toggles completion immediately
    const row = screen.getByTestId('todo-row-todo-1')
    fireEvent.click(within(row).getByRole('button', { name: 'Mark Review lesson 12 as completed' }))
    await waitFor(() => expect(api.updateTodo).toHaveBeenCalledWith('todo-1', { isCompleted: true }))
    expect(await screen.findByRole('button', { name: /COMPLETED \(1\)/ })).toBeInTheDocument()
  })

  it('adds, toggles, and deletes subtasks immediately inside Task Details', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Review vocabulary' }))

    const subtaskInput = screen.getByLabelText('Add subtask')
    fireEvent.change(subtaskInput, { target: { value: 'Read 10 cards' } })
    fireEvent.submit(subtaskInput.closest('form')!)

    await waitFor(() => expect(api.createSubtask).toHaveBeenCalledWith('todo-1', 'Read 10 cards'))
    expect(await screen.findByText('SUBTASKS (0 / 1)')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Mark subtask Read 10 cards as completed' }))
    await waitFor(() => expect(api.updateSubtask).toHaveBeenCalledWith('todo-1', 'sub-1', { isCompleted: true }))
    expect(await screen.findByText('100%')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Delete subtask Read 10 cards' }))
    await waitFor(() => expect(api.deleteSubtask).toHaveBeenCalledWith('todo-1', 'sub-1'))
  })

  it('supports manual tag and custom priority creation and filtering from sidebar', async () => {
    items = [
      todo({ id: 'todo-1', title: 'Task A', tags: [{ id: 'tag-ielts', name: 'IELTS' }], priorityId: 'prio-high', priority: { id: 'prio-high', name: 'High', tone: 'warning', sortOrder: 0 } }),
      todo({ id: 'todo-2', title: 'Task B' }),
    ]
    renderPage()

    expect(await screen.findByRole('button', { name: 'Task A' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Task B' })).toBeInTheDocument()

    // Create a manual tag from sidebar
    fireEvent.click(screen.getByRole('button', { name: 'Add tag' }))
    const tagInput = screen.getByLabelText('New tag name')
    fireEvent.change(tagInput, { target: { value: 'FluentA' } })
    fireEvent.submit(tagInput.closest('form')!)
    await waitFor(() => expect(api.createTag).toHaveBeenCalledWith('FluentA'))

    // Create a custom priority from sidebar
    fireEvent.click(screen.getByRole('button', { name: 'Add priority' }))
    const prioInput = screen.getByLabelText('New priority name')
    fireEvent.change(prioInput, { target: { value: 'Urgent' } })
    fireEvent.submit(prioInput.closest('form')!)
    await waitFor(() => expect(api.createPriority).toHaveBeenCalledWith({ name: 'Urgent', tone: 'warning' }))

    // Filter by #IELTS
    fireEvent.click(screen.getByRole('button', { name: '#IELTS' }))
    expect(screen.getByRole('button', { name: 'Task A' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Task B' })).not.toBeInTheDocument()
  })

  it('opens an owned deep-linked task outside My Day and handles unavailable ids safely', async () => {
    const outsideToday = todo({ id: 'outside-task', title: 'Next week task', date: '2035-07-29' })
    api.getTodo.mockResolvedValueOnce(outsideToday)
    const owned = renderPage('/todo?taskId=outside-task')

    expect(await screen.findByLabelText('Details for Next week task')).toBeInTheDocument()
    owned.unmount()

    api.getTodo.mockRejectedValueOnce(new Error('not found'))
    renderPage('/todo?taskId=foreign-or-missing')
    expect(await screen.findByRole('alert')).toHaveTextContent('This task is unavailable or no longer exists.')
  })

  it('soft-deletes a task after confirming the delete dialog', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Review vocabulary' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete task' }))

    const dialog = await screen.findByRole('alertdialog')
    expect(dialog).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(api.deleteTodo).toHaveBeenCalled())
    expect(api.deleteTodo.mock.calls[0]?.[0]).toBe('todo-1')
  })

  it('renders My Week 7-day strip, day switching, quick add, and duplicate', async () => {
    const dates = weekDates(todayUtc())
    items = [todo({
      note: 'Only visible in details',
      repeatPattern: 'Weekly',
      scheduledStartTime: '09:00',
      scheduledEndTime: '10:30',
      estimatedMinutes: 90,
      priorityId: 'prio-high',
      priority: priorities[0],
      tags: [tags[0]],
    })]
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: /My Week/ }))

    expect(await screen.findByRole('heading', { name: 'My Week' })).toBeInTheDocument()
    expect(screen.getByText(new RegExp(formatWeekShortRange(dates[0], dates[6])))).toBeInTheDocument()
    for (const date of dates) {
      expect(screen.getByTestId(`week-day-${date}`)).toBeInTheDocument()
    }

    // Select Monday in the 7-day strip
    fireEvent.click(screen.getByTestId(`week-day-${dates[0]}`))
    const weekInput = screen.getByTestId('todo-week-title-input')
    fireEvent.change(weekInput, { target: { value: 'Plan the week' } })
    fireEvent.submit(weekInput.closest('form')!)
    await waitFor(() => expect(api.createTodo).toHaveBeenCalledWith({
      title: 'Plan the week',
      date: dates[0],
      priorityId: undefined,
      tagIds: undefined,
    }))

    // Switch back to today and inspect the card
    fireEvent.click(screen.getByTestId(`week-day-${todayUtc()}`))
    const row = await screen.findByTestId('week-todo-todo-1')
    expect(within(row).getByText('09:00')).toBeInTheDocument()
    expect(within(row).getByText('High')).toBeInTheDocument()
    expect(within(row).getByText('#IELTS')).toBeInTheDocument()

    fireEvent.contextMenu(row)
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Duplicate task' }))
    await waitFor(() => expect(api.duplicateTodo).toHaveBeenCalledWith('todo-1'))
  })
})
