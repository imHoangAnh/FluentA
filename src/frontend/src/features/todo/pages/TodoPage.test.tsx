import { QueryClient } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders } from '@/app/providers'
import type { CreateTodoInput, TodoItem, UpdateTodoInput } from '../api/todo.api'
import { toDateInput } from '../todo-date'
import { TodoPage } from './TodoPage'

const api = vi.hoisted(() => ({
  listByDate: vi.fn(),
  listByRange: vi.fn(),
  createTodo: vi.fn(),
  updateTodo: vi.fn(),
  deleteTodo: vi.fn(),
}))

vi.mock('../api/todo.api', async (importOriginal) => ({
  ...await importOriginal<typeof import('../api/todo.api')>(),
  ...api,
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
    completedAt: null,
    createdAt: '2026-07-22T01:00:00Z',
    updatedAt: '2026-07-22T01:00:00Z',
    ...overrides,
  }
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(<AppProviders queryClient={queryClient}><TodoPage /></AppProviders>)
}

describe('TodoPage My Day workspace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    items = [todo()]
    api.listByDate.mockImplementation(async () => [...items])
    api.listByRange.mockImplementation(async () => [...items])
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
    api.deleteTodo.mockImplementation(async (id: string) => {
      items = items.filter((item) => item.id !== id)
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

  it('requires confirmation before deleting a task', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Review vocabulary' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete task' }))

    expect(await screen.findByRole('alertdialog', { name: 'Delete task?' })).toHaveTextContent('Review vocabulary')
    expect(api.deleteTodo).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Delete task' }))
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
})
