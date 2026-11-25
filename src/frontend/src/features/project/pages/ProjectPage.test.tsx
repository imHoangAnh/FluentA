import { QueryClient } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders } from '@/app/providers'
import type {
  CreateProjectCardInput,
  ProjectBoardDetail,
  ProjectBoardSummary,
  ProjectCard,
  ProjectCardChecklistItem,
  ProjectLabel,
  ProjectMilestone,
  UpdateProjectCardInput,
} from '../api/project.api'
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
  createMilestone: vi.fn(),
  updateMilestone: vi.fn(),
  deleteMilestone: vi.fn(),
  createLabel: vi.fn(),
  updateLabel: vi.fn(),
  deleteLabel: vi.fn(),
  createChecklistItem: vi.fn(),
  updateChecklistItem: vi.fn(),
  deleteChecklistItem: vi.fn(),
}))

vi.mock('../api/project.api', async (importOriginal) => ({
  ...await importOriginal<typeof import('../api/project.api')>(),
  ...api,
}))

let boards: ProjectBoardSummary[]
let boardDetails: Record<string, ProjectBoardDetail>

function seedState() {
  const m1: ProjectMilestone = { id: 'ms-1', boardId: 'board-1', name: 'Milestone M1: Top-Bar & DS', sortOrder: 0 }
  const labelNotes: ProjectLabel = { id: 'lbl-1', boardId: 'board-1', name: '#Notes', tone: 'info' }
  const labelShipped: ProjectLabel = { id: 'lbl-2', boardId: 'board-1', name: 'Shipped', tone: 'success' }

  const card1: ProjectCard = {
    id: 'card-1',
    columnId: 'board-1-todo',
    title: 'Draft outline',
    description: 'Prepare the first draft',
    priority: 'High',
    deadline: '2026-12-04',
    sortOrder: 0,
    createdAt: '2026-07-20T00:00:00Z',
    updatedAt: '2026-07-20T00:00:00Z',
    milestoneId: m1.id,
    milestone: m1,
    labelId: labelNotes.id,
    label: labelNotes,
    checklistItems: [
      { id: 'chk-1', title: 'Step 1', isCompleted: true, sortOrder: 0 },
      { id: 'chk-2', title: 'Step 2', isCompleted: false, sortOrder: 1 },
    ],
  }

  const cardDone: ProjectCard = {
    id: 'card-2',
    columnId: 'board-1-done',
    title: 'Standardize tokens',
    description: null,
    priority: 'Medium',
    deadline: null,
    sortOrder: 0,
    createdAt: '2026-07-20T00:00:00Z',
    updatedAt: '2026-07-20T00:00:00Z',
    milestoneId: m1.id,
    milestone: m1,
    labelId: labelShipped.id,
    label: labelShipped,
    checklistItems: [],
  }

  boards = [
    { id: 'board-1', name: 'Study project', columnCount: 4, cardCount: 2, createdAt: '2026-07-20T00:00:00Z', updatedAt: '2026-07-20T00:00:00Z' },
    { id: 'board-2', name: 'Exam prep', columnCount: 4, cardCount: 0, createdAt: '2026-07-21T00:00:00Z', updatedAt: '2026-07-21T00:00:00Z' },
  ]

  boardDetails = {
    'board-1': {
      id: 'board-1',
      name: 'Study project',
      createdAt: '2026-07-20T00:00:00Z',
      updatedAt: '2026-07-20T00:00:00Z',
      milestones: [m1],
      labels: [labelNotes, labelShipped],
      columns: [
        { id: 'board-1-backlog', name: 'Backlog', sortOrder: 0, createdAt: '2026-07-20T00:00:00Z', updatedAt: '2026-07-20T00:00:00Z', cards: [] },
        { id: 'board-1-todo', name: 'To Do', sortOrder: 1, createdAt: '2026-07-20T00:00:00Z', updatedAt: '2026-07-20T00:00:00Z', cards: [card1] },
        { id: 'board-1-progress', name: 'In Progress', sortOrder: 2, createdAt: '2026-07-20T00:00:00Z', updatedAt: '2026-07-20T00:00:00Z', cards: [] },
        { id: 'board-1-done', name: 'Done', sortOrder: 3, createdAt: '2026-07-20T00:00:00Z', updatedAt: '2026-07-20T00:00:00Z', cards: [cardDone] },
      ],
    },
    'board-2': {
      id: 'board-2',
      name: 'Exam prep',
      createdAt: '2026-07-21T00:00:00Z',
      updatedAt: '2026-07-21T00:00:00Z',
      milestones: [],
      labels: [],
      columns: [
        { id: 'board-2-backlog', name: 'Backlog', sortOrder: 0, createdAt: '2026-07-21T00:00:00Z', updatedAt: '2026-07-21T00:00:00Z', cards: [] },
        { id: 'board-2-todo', name: 'To Do', sortOrder: 1, createdAt: '2026-07-21T00:00:00Z', updatedAt: '2026-07-21T00:00:00Z', cards: [] },
        { id: 'board-2-progress', name: 'In Progress', sortOrder: 2, createdAt: '2026-07-21T00:00:00Z', updatedAt: '2026-07-21T00:00:00Z', cards: [] },
        { id: 'board-2-done', name: 'Done', sortOrder: 3, createdAt: '2026-07-21T00:00:00Z', updatedAt: '2026-07-21T00:00:00Z', cards: [] },
      ],
    },
  }
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(<AppProviders queryClient={queryClient}><ProjectPage /></AppProviders>)
}

describe('ProjectPage project workspace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    seedState()

    api.listBoards.mockImplementation(async () => [...boards])
    api.getBoard.mockImplementation(async (id: string) => structuredClone(boardDetails[id]))
    api.deleteBoard.mockImplementation(async (id: string) => {
      boards = boards.filter((b) => b.id !== id)
      return { deleted: true }
    })
    api.createColumn.mockResolvedValue({})
    api.createCard.mockImplementation(async (boardId: string, input: CreateProjectCardInput) => {
      const created: ProjectCard = {
        id: 'card-created',
        columnId: input.columnId,
        title: input.title,
        description: input.description ?? null,
        priority: (input.priority as ProjectCard['priority']) ?? 'Medium',
        deadline: input.deadline ?? null,
        sortOrder: 0,
        createdAt: '2026-07-22T00:00:00Z',
        updatedAt: '2026-07-22T00:00:00Z',
        milestoneId: input.milestoneId ?? null,
        labelId: input.labelId ?? null,
        checklistItems: (input.checklistTitles ?? []).map((t, idx) => ({
          id: `chk-new-${idx}`,
          title: t,
          isCompleted: false,
          sortOrder: idx,
        })),
      }
      const board = boardDetails[boardId]
      const col = board.columns.find((c) => c.id === input.columnId)
      col?.cards.push(created)
      return created
    })
    api.updateCard.mockImplementation(async (cardId: string, patch: UpdateProjectCardInput) => {
      for (const b of Object.values(boardDetails)) {
        for (const c of b.columns) {
          const found = c.cards.find((card) => card.id === cardId)
          if (found) {
            Object.assign(found, patch)
            return found
          }
        }
      }
      return {}
    })
    api.deleteColumn.mockResolvedValue({ deleted: true })
    api.deleteCard.mockResolvedValue({ deleted: true })
    api.moveCard.mockResolvedValue({})
    api.createMilestone.mockImplementation(async (boardId: string, name: string) => {
      const created: ProjectMilestone = {
        id: `ms-${(boardDetails[boardId].milestones ?? []).length + 1}`,
        boardId,
        name,
        sortOrder: (boardDetails[boardId].milestones ?? []).length,
      }
      boardDetails[boardId].milestones = [...(boardDetails[boardId].milestones ?? []), created]
      return created
    })
    api.updateMilestone.mockResolvedValue({})
    api.deleteMilestone.mockResolvedValue({ deleted: true })
    api.createLabel.mockImplementation(async (boardId: string, input: { name: string; tone?: ProjectLabel['tone'] }) => {
      const created: ProjectLabel = {
        id: `lbl-${(boardDetails[boardId].labels ?? []).length + 1}`,
        boardId,
        name: input.name,
        tone: input.tone ?? 'primary',
      }
      boardDetails[boardId].labels = [...(boardDetails[boardId].labels ?? []), created]
      return created
    })
    api.updateLabel.mockResolvedValue({})
    api.deleteLabel.mockResolvedValue({ deleted: true })
    api.createChecklistItem.mockImplementation(async (cardId: string, title: string) => {
      const created: ProjectCardChecklistItem = { id: 'chk-added', title, isCompleted: false, sortOrder: 2 }
      for (const b of Object.values(boardDetails)) {
        for (const c of b.columns) {
          const card = c.cards.find((item) => item.id === cardId)
          if (card) {
            card.checklistItems = [...(card.checklistItems ?? []), created]
          }
        }
      }
      return created
    })
    api.updateChecklistItem.mockImplementation(async (cardId: string, itemId: string, patch: { isCompleted?: boolean }) => {
      let updated!: ProjectCardChecklistItem
      for (const b of Object.values(boardDetails)) {
        for (const c of b.columns) {
          const card = c.cards.find((item) => item.id === cardId)
          if (card) {
            card.checklistItems = (card.checklistItems ?? []).map((item) => {
              if (item.id !== itemId) return item
              updated = { ...item, ...patch }
              return updated
            })
          }
        }
      }
      return updated
    })
    api.deleteChecklistItem.mockResolvedValue({ deleted: true })
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

  it('switches boards via the board switcher dropdown and shows milestone progress', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Study project' })).toBeInTheDocument()
    const progressPill = await screen.findByTestId('project-milestone-progress')
    expect(progressPill).toHaveTextContent('Milestone M1: Top-Bar & DS')
    expect(progressPill).toHaveTextContent('50%')

    fireEvent.click(screen.getByRole('button', { name: /Project board: Study project/ }))
    fireEvent.click(await screen.findByRole('option', { name: 'Exam prep' }))
    expect(await screen.findByRole('heading', { name: 'Exam prep' })).toBeInTheDocument()
  })

  it('deletes a selected project from the board switcher with confirmation dialog', async () => {
    renderPage()
    await screen.findByRole('heading', { name: 'Study project' })

    fireEvent.click(screen.getByRole('button', { name: /Project board: Study project/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Delete project Study project' }))
    const confirmBtn = await screen.findByRole('button', { name: 'Delete' })
    fireEvent.click(confirmBtn)

    await waitFor(() => expect(api.deleteBoard).toHaveBeenCalledTimes(1))
    expect(api.deleteBoard).toHaveBeenCalledWith('board-1')
  })

  it('renders Figma toolbar filters, 4 columns, card badges, and checklist ratio', async () => {
    renderPage()

    await screen.findByRole('heading', { name: 'Study project' })
    expect(screen.getByLabelText('Filter by priority')).toBeInTheDocument()
    expect(screen.getByLabelText('Filter by deadline')).toBeInTheDocument()
    expect(screen.getByLabelText('Filter by milestone')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '+ Add Column' })).toBeInTheDocument()

    await screen.findByTestId('project-column-Backlog')
    for (const column of ['Backlog', 'To Do', 'In Progress', 'Done']) {
      expect(screen.getByTestId(`project-column-${column}`)).toBeInTheDocument()
    }

    const card1 = screen.getByTestId('project-card-Draft outline')
    expect(within(card1).getByText('#Notes')).toBeInTheDocument()
    expect(within(card1).getByText('1/2')).toBeInTheDocument()
    expect(within(card1).getByText('Dec 04')).toBeInTheDocument()
  })

  it('opens right slide-over Card Details to edit, manage checklist, create label, and create cards', async () => {
    renderPage()
    const editTrigger = await screen.findByTestId('project-card-edit-card-1')

    fireEvent.click(editTrigger)
    const editPanel = await screen.findByRole('complementary', { name: 'Card details' })
    expect(within(editPanel).getByTestId('project-edit-title-input')).toHaveValue('Draft outline')
    expect(within(editPanel).getByText('CHECKLIST (1 / 2)')).toBeInTheDocument()

    // Toggle a checklist item immediately
    fireEvent.click(within(editPanel).getByRole('button', { name: 'Check Step 2' }))
    await waitFor(() => expect(api.updateChecklistItem).toHaveBeenCalledWith('card-1', 'chk-2', { isCompleted: true }))

    // Add a new checklist item immediately
    const addChk = within(editPanel).getByLabelText('Add checklist item')
    fireEvent.change(addChk, { target: { value: 'Step 3' } })
    fireEvent.keyDown(addChk, { key: 'Enter' })
    await waitFor(() => expect(api.createChecklistItem).toHaveBeenCalledWith('card-1', 'Step 3'))

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

  it('reveals Add column dialog and validates column name', async () => {
    renderPage()
    await screen.findByRole('heading', { name: 'Study project' })

    expect(screen.queryByTestId('project-column-name-input')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '+ Add Column' }))
    const input = screen.getByTestId('project-column-name-input')
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled()

    fireEvent.change(input, { target: { value: 'Research' } })
    fireEvent.submit(input.closest('form')!)
    await waitFor(() => expect(api.createColumn).toHaveBeenCalledWith('board-1', 'Research'))
  })
})
