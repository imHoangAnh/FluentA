import { QueryClient } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders } from '@/app/providers'
import { KanbanPage } from './KanbanPage'

const api = vi.hoisted(() => ({
  listBoards: vi.fn(),
  createBoard: vi.fn(),
  getBoard: vi.fn(),
  deleteBoard: vi.fn(),
  createColumn: vi.fn(),
  updateColumn: vi.fn(),
  deleteColumn: vi.fn(),
  createCard: vi.fn(),
  updateCard: vi.fn(),
  moveCard: vi.fn(),
  deleteCard: vi.fn(),
}))

vi.mock('../api/kanban.api', async (importOriginal) => ({
  ...await importOriginal<typeof import('../api/kanban.api')>(),
  ...api,
}))

const boards = [
  { id: 'board-1', name: 'Study project', columnCount: 2, cardCount: 1, createdAt: '2026-07-20T00:00:00Z', updatedAt: '2026-07-20T00:00:00Z' },
  { id: 'board-2', name: 'Exam prep', columnCount: 2, cardCount: 0, createdAt: '2026-07-21T00:00:00Z', updatedAt: '2026-07-21T00:00:00Z' },
]

function board(id: string) {
  return {
    id,
    name: id === 'board-1' ? 'Study project' : 'Exam prep',
    createdAt: '2026-07-20T00:00:00Z',
    updatedAt: '2026-07-20T00:00:00Z',
    columns: [
      {
        id: `${id}-todo`,
        name: 'To Do',
        sortOrder: 0,
        createdAt: '2026-07-20T00:00:00Z',
        updatedAt: '2026-07-20T00:00:00Z',
        cards: id === 'board-1' ? [{
          id: 'card-1',
          columnId: `${id}-todo`,
          title: 'Draft outline',
          description: 'Prepare the first draft',
          priority: 'High',
          deadline: '2026-07-30',
          sortOrder: 0,
          createdAt: '2026-07-20T00:00:00Z',
          updatedAt: '2026-07-20T00:00:00Z',
        }] : [],
      },
      {
        id: `${id}-done`,
        name: 'Done',
        sortOrder: 1,
        createdAt: '2026-07-20T00:00:00Z',
        updatedAt: '2026-07-20T00:00:00Z',
        cards: [],
      },
    ],
  }
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(<AppProviders queryClient={queryClient}><KanbanPage /></AppProviders>)
}

describe('KanbanPage project workspace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.listBoards.mockResolvedValue(boards)
    api.getBoard.mockImplementation(async (id: string) => board(id))
    api.deleteBoard.mockResolvedValue(undefined)
    api.createColumn.mockResolvedValue({})
    api.createCard.mockResolvedValue({})
    api.updateCard.mockResolvedValue({})
    api.deleteCard.mockResolvedValue(undefined)
    api.moveCard.mockResolvedValue({})
  })

  it('uses the selected project as the visible heading', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Study project' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Exam prep' }))
    expect(await screen.findByRole('heading', { name: 'Exam prep' })).toBeInTheDocument()
  })

  it('confirms deletion for the exact right-clicked project', async () => {
    renderPage()
    await screen.findByRole('heading', { name: 'Study project' })

    const inactiveProject = screen.getByRole('button', { name: 'Exam prep' })
    fireEvent.contextMenu(inactiveProject)
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete project?' })
    expect(within(dialog).getByText(/Exam prep/)).toBeInTheDocument()
    expect(api.deleteBoard).not.toHaveBeenCalled()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(api.deleteBoard).not.toHaveBeenCalled()

    fireEvent.keyDown(inactiveProject, { key: 'F10', shiftKey: true })
    fireEvent.click(await screen.findByRole('button', { name: 'Delete project' }))
    await waitFor(() => expect(api.deleteBoard).toHaveBeenCalledTimes(1))
    expect(api.deleteBoard).toHaveBeenCalledWith('board-2')
  })

  it('submits only one board deletion while confirmation is pending', async () => {
    let resolveDelete: (() => void) | undefined
    api.deleteBoard.mockImplementation(() => new Promise<void>((resolve) => { resolveDelete = resolve }))
    renderPage()
    await screen.findByRole('heading', { name: 'Study project' })

    fireEvent.keyDown(screen.getByRole('button', { name: 'Study project' }), { key: 'ContextMenu' })
    const confirm = await screen.findByRole('button', { name: 'Delete project' })
    fireEvent.click(confirm)
    fireEvent.click(confirm)

    await waitFor(() => expect(api.deleteBoard).toHaveBeenCalledTimes(1))
    resolveDelete?.()
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
  })

  it('opens the same right panel for editing and creating cards while Move stays on the card', async () => {
    renderPage()
    const editTrigger = await screen.findByRole('button', { name: 'Edit Draft outline' })
    expect(screen.getByLabelText('Move Draft outline to column')).toBeInTheDocument()

    fireEvent.click(editTrigger)
    const editPanel = await screen.findByRole('complementary', { name: 'Edit card' })
    expect(within(editPanel).getByTestId('kanban-edit-title-input')).toHaveValue('Draft outline')
    expect(within(editPanel).queryByText(/Move to/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Edit card' })).not.toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('complementary')).not.toBeInTheDocument())
    await waitFor(() => expect(editTrigger).toHaveFocus())

    const addTrigger = within(screen.getByTestId('kanban-column-To Do')).getByRole('button', { name: 'Add Card' })
    fireEvent.click(addTrigger)
    const createPanel = await screen.findByRole('complementary', { name: 'Create card' })
    fireEvent.change(within(createPanel).getByTestId('kanban-edit-title-input'), { target: { value: 'Research sources' } })
    fireEvent.click(within(createPanel).getByRole('button', { name: 'Save card' }))

    await waitFor(() => expect(api.createCard).toHaveBeenCalledTimes(1))
    expect(api.createCard.mock.calls[0]?.[1]).toMatchObject({ title: 'Research sources', columnId: 'board-1-todo' })
  })

  it('reveals Add column from the filter toolbar and preserves required-name validation', async () => {
    renderPage()
    await screen.findByRole('heading', { name: 'Study project' })

    expect(screen.queryByTestId('kanban-column-name-input')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Add column' }))
    const input = screen.getByTestId('kanban-column-name-input')
    expect(screen.getByRole('button', { name: 'Create column' })).toBeDisabled()

    fireEvent.change(input, { target: { value: 'Research' } })
    fireEvent.submit(input.closest('form')!)
    await waitFor(() => expect(api.createColumn).toHaveBeenCalledWith('board-1', 'Research'))
  })
})
