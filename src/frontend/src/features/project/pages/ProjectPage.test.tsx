import { QueryClient } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders } from '@/app/providers'
import { ProjectPage } from './ProjectPage'

const api = vi.hoisted(() => ({
  listBoards: vi.fn(),
  createBoard: vi.fn(),
  updateBoard: vi.fn(),
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

vi.mock('../api/project.api', async (importOriginal) => ({
  ...await importOriginal<typeof import('../api/project.api')>(),
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
        id: `${id}-progress`,
        name: 'In Progress',
        sortOrder: 1,
        createdAt: '2026-07-20T00:00:00Z',
        updatedAt: '2026-07-20T00:00:00Z',
        cards: [],
      },
      {
        id: `${id}-done`,
        name: 'Done',
        sortOrder: 2,
        createdAt: '2026-07-20T00:00:00Z',
        updatedAt: '2026-07-20T00:00:00Z',
        cards: [],
      },
    ],
  }
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(<AppProviders queryClient={queryClient}><ProjectPage /></AppProviders>)
}

describe('ProjectPage project workspace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.listBoards.mockResolvedValue(boards)
    api.getBoard.mockImplementation(async (id: string) => board(id))
    api.deleteBoard.mockResolvedValue({ id: 'trash-board-1' })
    api.createColumn.mockResolvedValue({})
    api.createCard.mockResolvedValue({})
    api.updateCard.mockResolvedValue({})
    api.deleteColumn.mockResolvedValue({ id: 'trash-column-1' })
    api.deleteCard.mockResolvedValue({ id: 'trash-card-1' })
    api.moveCard.mockResolvedValue({})
  })

  it('renders a centered project empty state and opens its create flow', async () => {
    api.listBoards.mockResolvedValueOnce([])
    renderPage()

    expect(await screen.findByRole('heading', { name: 'No projects' })).toBeInTheDocument()
    expect(screen.getByText('Get started by creating a new project.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'New Project' }))

    expect(await screen.findByTestId('project-empty-project-input')).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Create Project' })).toBeInTheDocument()
  })

  it('uses the selected project as the visible heading', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Study project' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Exam prep' }))
    expect(await screen.findByRole('heading', { name: 'Exam prep' })).toBeInTheDocument()
  })

  it('moves the exact right-clicked project to Trash with context menu and confirmation dialog', async () => {
    renderPage()
    await screen.findByRole('heading', { name: 'Study project' })

    const inactiveProject = screen.getByRole('button', { name: 'Exam prep' })
    fireEvent.contextMenu(inactiveProject)
    const deleteMenuItem = await screen.findByRole('menuitem', { name: 'Delete' })
    fireEvent.click(deleteMenuItem)
    const confirmBtn = await screen.findByRole('button', { name: 'Delete' })
    fireEvent.click(confirmBtn)
  })

  it('renders the supported project-board hierarchy without reference-only controls', async () => {
    renderPage()

    const heading = await screen.findByRole('heading', { name: 'Study project' })
    const projectNavigation = screen.getByTestId('project-navigation')
    const boardSurface = screen.getByTestId('project-board-surface')
    const filters = screen.getByLabelText('Project card filters')

    expect(projectNavigation.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(heading.compareDocumentPosition(filters) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(filters.compareDocumentPosition(boardSurface) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Add column' })).toBeInTheDocument()
    expect(screen.getByLabelText('Filter by priority')).toBeInTheDocument()
    expect(screen.getByLabelText('Filter by deadline')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText(/search cards/i)).not.toBeInTheDocument()
    expect(screen.queryByText('Assignee')).not.toBeInTheDocument()
    expect(screen.queryByText('Clear filters')).not.toBeInTheDocument()
  })

  it('places Add Card before a useful empty state in every empty column', async () => {
    renderPage()
    await screen.findByRole('heading', { name: 'Study project' })

    const progressColumn = screen.getByTestId('project-column-In Progress')
    const addCard = within(progressColumn).getByRole('button', { name: 'Add Card' })
    const emptyState = within(progressColumn).getByText('No cards yet')

    expect(addCard.compareDocumentPosition(emptyState) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(within(progressColumn).getByText('Add a card to get started.')).toBeInTheDocument()
  })

  it('submits only one board deletion while the move is pending', async () => {
    let resolveDelete: (() => void) | undefined
    api.deleteBoard.mockImplementation(() => new Promise<{ id: string }>((resolve) => { resolveDelete = () => resolve({ id: 'trash-board-1' }) }))
    renderPage()
    await screen.findByRole('heading', { name: 'Study project' })

    const boardTab = screen.getByRole('button', { name: 'Study project' })
    fireEvent.contextMenu(boardTab)
    const deleteMenuItem = await screen.findByRole('menuitem', { name: 'Delete' })
    fireEvent.click(deleteMenuItem)
    const confirmBtn = await screen.findByRole('button', { name: 'Delete' })
    fireEvent.click(confirmBtn)

    await waitFor(() => expect(api.deleteBoard).toHaveBeenCalledTimes(1))
    resolveDelete?.()
    await waitFor(() => expect(api.listBoards).toHaveBeenCalledTimes(2))
  })

  it('opens the same right panel for editing and creating cards while Move stays on the card', async () => {
    renderPage()
    const editTrigger = await screen.findByTestId('project-card-edit-card-1')

    fireEvent.click(editTrigger)
    const editPanel = await screen.findByRole('complementary', { name: 'Card details' })
    expect(screen.getByRole('dialog')).toHaveClass('border-0', 'bg-transparent', 'p-0', 'shadow-none')
    expect(within(editPanel).getByTestId('project-edit-title-input')).toHaveValue('Draft outline')
    expect(within(editPanel).queryByText(/Move to/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Edit card' })).not.toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('complementary')).not.toBeInTheDocument())
    await waitFor(() => expect(editTrigger).toHaveFocus())

    const addTrigger = within(screen.getByTestId('project-column-To Do')).getByRole('button', { name: 'Add Card' })
    fireEvent.click(addTrigger)
    const createPanel = await screen.findByRole('complementary', { name: 'Card details' })
    fireEvent.change(within(createPanel).getByTestId('project-edit-title-input'), { target: { value: 'Research sources' } })
    fireEvent.click(within(createPanel).getByRole('button', { name: 'Save card' }))

    await waitFor(() => expect(api.createCard).toHaveBeenCalledTimes(1))
    expect(api.createCard.mock.calls[0]?.[1]).toMatchObject({ title: 'Research sources', columnId: 'board-1-todo' })
  })

  it('reveals Add column from the filter toolbar and preserves required-name validation', async () => {
    renderPage()
    await screen.findByRole('heading', { name: 'Study project' })

    expect(screen.queryByTestId('project-column-name-input')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Add column' }))
    const input = screen.getByTestId('project-column-name-input')
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled()

    fireEvent.change(input, { target: { value: 'Research' } })
    fireEvent.submit(input.closest('form')!)
    await waitFor(() => expect(api.createColumn).toHaveBeenCalledWith('board-1', 'Research'))
  })
})
