import { QueryClient } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AppProviders } from '@/app/providers'
import type { CreateTodoInput, TodoItem, UpdateTodoInput } from '../api/todo.api'
import { formatWeekRange, toDateInput, weekDates } from '../model/todo-date'
import { TodoPage } from './TodoPage'

const api = vi.hoisted(() => ({
  listByDate: vi.fn(),
  listByRange: vi.fn(),
  getTodo: vi.fn(),
  createTodo: vi.fn(),
  updateTodo: vi.fn(),
  duplicateTodo: vi.fn(),
  deleteTodo: vi.fn(),
}))

vi.mock('../api/todo.api', async (importOriginal) => ({
  ...await importOriginal<typeof import('../api/todo.api')>(),
  ...api,
}))

vi.mock('../lib/todo-reminder', () => ({
  createBrowserReminder: vi.fn((_date: string, time: string) => ({
    reminder: {
      time,
      timeZoneId: 'UTC',
      scheduledAtUtc: '2035-07-22T10:30:00.000Z',
    },
  })),
}))

let items: TodoItem[]

function todo(overrides: Partial<TodoItem> = {}): TodoItem {
  return {
    id: 'todo-1',
    title: 'Review vocabulary',
    note: null,
    date: toDateInput(new Date()),
    sortOrder: 0,
    isCompleted: false,
    isImportant: false,
    repeatPattern: null,
    reminder: null,
    completedAt: null,
    createdAt: '2026-07-22T01:00:00Z',
    updatedAt: '2026-07-22T01:00:00Z',
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

describe('TodoPage My Day workspace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    items = [todo()]
    api.listByDate.mockImplementation(async () => [...items])
    api.listByRange.mockImplementation(async () => [...items])
    api.getTodo.mockImplementation(async (id: string) => items.find((item) => item.id === id) ?? Promise.reject(new Error('not found')))
    api.createTodo.mockImplementation(async (input: CreateTodoInput) => {
      const created = todo({ id: 'todo-created', title: input.title, date: input.date, note: input.note ?? null })
      items = [...items, created]
      return created
    })
    api.updateTodo.mockImplementation(async (id: string, patch: UpdateTodoInput) => {
      let updated = items.find((item) => item.id === id)!
      updated = { ...updated, ...patch, updatedAt: '2026-07-22T02:00:00Z' }
      items = items.map((item) => item.id === id ? updated : item)
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
      return {
        id: 'trash-todo-1',
        entityKind: 'Todo',
        entityId: id,
        displayName: 'Review vocabulary',
        originalLocation: toDateInput(new Date()),
        trashedAt: '2026-07-28T00:00:00Z',
        purgeAfterAt: '2026-08-27T00:00:00Z',
      }
    })
  })

  it('keeps My Day list-first and opens details after quick creation', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: 'My Day' })).toBeInTheDocument()
    expect(screen.queryByText('Grid')).not.toBeInTheDocument()
    expect(screen.queryByText('Group')).not.toBeInTheDocument()
    expect(screen.queryByText('Suggestions')).not.toBeInTheDocument()

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
      date: toDateInput(new Date()),
    })
    expect(screen.getByLabelText('Task title')).toHaveFocus()
  })

  it('renders explicit loading, empty, and error feedback', async () => {
    api.listByDate.mockImplementationOnce(() => new Promise(() => undefined))
    const loadingView = renderPage()
    expect(await screen.findByRole('status', { name: '' })).toHaveTextContent('Loading tasks...')
    loadingView.unmount()

    api.listByDate.mockResolvedValueOnce([])
    const emptyView = renderPage()
    expect(await screen.findByRole('heading', { name: 'Your day is clear' })).toBeInTheDocument()
    emptyView.unmount()

    api.listByDate.mockRejectedValueOnce(new Error('offline'))
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load My Day tasks.')
  })

  it('shares completion and importance between the row and details panel', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Review vocabulary' }))

    fireEvent.click(screen.getByRole('button', { name: 'Mark as important' }))
    await waitFor(() => expect(api.updateTodo).toHaveBeenCalledWith('todo-1', { isImportant: true }))
    expect(screen.getByRole('button', { name: 'Remove importance from Review vocabulary' })).toHaveAttribute('aria-pressed', 'true')

    const details = screen.getByLabelText('Details for Review vocabulary')
    fireEvent.click(within(details).getByRole('button', { name: 'Mark Review vocabulary as completed' }))
    await waitFor(() => expect(api.updateTodo).toHaveBeenCalledWith('todo-1', { isCompleted: true }))
    expect(await screen.findByRole('button', { name: /Completed/ })).toHaveTextContent('1')
  })

  it('autosaves title on Enter and note on blur', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Review vocabulary' }))

    const title = screen.getByLabelText('Task title')
    fireEvent.change(title, { target: { value: 'Review lesson 12' } })
    fireEvent.keyDown(title, { key: 'Enter' })
    await waitFor(() => expect(api.updateTodo).toHaveBeenCalledWith('todo-1', { title: 'Review lesson 12' }))

    const note = screen.getByLabelText('Note')
    fireEvent.change(note, { target: { value: 'Focus on the new expressions.' } })
    fireEvent.blur(note)
    await waitFor(() => expect(api.updateTodo).toHaveBeenCalledWith('todo-1', { note: 'Focus on the new expressions.' }))

    fireEvent.click(screen.getByRole('button', { name: 'Close details' }))
    expect(screen.queryByLabelText('Details for Review lesson 12')).not.toBeInTheDocument()
  })

  it('sets and clears one optional repeat pattern from the details menu', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Review vocabulary' }))

    fireEvent.click(screen.getByRole('button', { name: 'Repeat: Does not repeat' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Monthly' }))
    await waitFor(() => expect(api.updateTodo).toHaveBeenCalledWith('todo-1', { repeatPattern: 'Monthly' }))

    fireEvent.click(await screen.findByRole('button', { name: 'Repeat: Monthly' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Does not repeat' }))
    await waitFor(() => expect(api.updateTodo).toHaveBeenCalledWith('todo-1', { repeatPattern: null }))
  })

  it('sets and clears one optional time-only reminder from details', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Review vocabulary' }))

    fireEvent.click(screen.getByRole('button', { name: 'Reminder: Not set' }))
    fireEvent.change(screen.getByLabelText('Reminder time'), { target: { value: '10:30' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(api.updateTodo).toHaveBeenCalledWith('todo-1', {
      reminder: {
        time: '10:30',
        timeZoneId: 'UTC',
        scheduledAtUtc: '2035-07-22T10:30:00.000Z',
      },
    }))

    fireEvent.click(await screen.findByRole('button', { name: 'Reminder: 10:30' }))
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
    await waitFor(() => expect(api.updateTodo).toHaveBeenCalledWith('todo-1', { reminder: null }))
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

  it('moves a task to Trash after confirming the delete dialog', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Review vocabulary' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete task' }))

    const dialog = await screen.findByRole('alertdialog')
    expect(dialog).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(api.deleteTodo).toHaveBeenCalled())
    expect(api.deleteTodo.mock.calls[0]?.[0]).toBe('todo-1')
  })

  it('keeps completed tasks collapsed and restores them to active from the context menu', async () => {
    items = [todo({ isCompleted: true, completedAt: '2026-07-22T03:00:00Z' })]
    renderPage()

    const completedToggle = await screen.findByRole('button', { name: /Completed/ })
    expect(completedToggle).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(completedToggle)
    const row = screen.getByTestId('todo-row-todo-1')
    fireEvent.contextMenu(row)

    const activate = await screen.findByRole('menuitem', { name: 'Mark as active' })
    fireEvent.click(activate)
    await waitFor(() => expect(api.updateTodo).toHaveBeenCalledWith('todo-1', { isCompleted: false }))
  })

  it('renders the compact Week workspace with per-day quick add, shared details, and duplicate', async () => {
    items = [todo({
      note: 'Only visible in details',
      isImportant: true,
      repeatPattern: 'Weekly',
      reminder: {
        time: '10:30',
        timeZoneId: 'UTC',
        scheduledAtUtc: '2035-07-22T10:30:00.000Z',
      },
    })]
    const dates = weekDates(toDateInput(new Date()))
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: 'My Day menu' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Week' }))

    expect(await screen.findByRole('heading', { name: 'Week' })).toBeInTheDocument()
    expect(screen.getByText(formatWeekRange(dates[0], dates[6]))).toBeInTheDocument()
    expect(await screen.findAllByPlaceholderText('Add a task')).toHaveLength(7)
    for (const weekday of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']) {
      expect(screen.getByRole('heading', { name: weekday })).toBeInTheDocument()
    }

    const mondayInput = screen.getByLabelText('Add a task for Monday')
    fireEvent.change(mondayInput, { target: { value: 'Plan the week' } })
    fireEvent.submit(mondayInput.closest('form')!)
    await waitFor(() => expect(api.createTodo).toHaveBeenCalledWith({ title: 'Plan the week', date: dates[0] }))
    expect(screen.queryByLabelText('Details for Plan the week')).not.toBeInTheDocument()

    const row = await screen.findByTestId('week-todo-todo-1')
    expect(within(row).getByRole('button', { name: 'Review vocabulary' })).toBeInTheDocument()
    expect(within(row).getByRole('button', { name: 'Remove importance from Review vocabulary' })).toBeInTheDocument()
    expect(within(row).queryByText('Only visible in details')).not.toBeInTheDocument()
    expect(within(row).queryByText('Weekly')).not.toBeInTheDocument()
    expect(within(row).queryByText('10:30')).not.toBeInTheDocument()

    fireEvent.click(within(row).getByRole('button', { name: 'Review vocabulary' }))
    expect(await screen.findByLabelText('Details for Review vocabulary')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Close details' }))

    fireEvent.contextMenu(row)
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Duplicate task' }))
    await waitFor(() => expect(api.duplicateTodo).toHaveBeenCalledWith('todo-1'))
  })
})
