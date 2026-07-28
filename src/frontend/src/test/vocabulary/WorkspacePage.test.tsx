import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { WorkspacePage } from '@/features/vocabulary/pages/WorkspacePage'
import * as vocabularyApi from '@/features/vocabulary/api/vocabulary.api'
import { AppProviders } from '@/app/providers'

vi.mock('@/features/vocabulary/api/vocabulary.api', async () => {
  const actual = await vi.importActual<typeof import('@/features/vocabulary/api/vocabulary.api')>('@/features/vocabulary/api/vocabulary.api')
  return {
    ...actual,
    listBoards: vi.fn(),
    createBoard: vi.fn(),
    getBoard: vi.fn(),
    updateBoard: vi.fn(),
    createPage: vi.fn(),
    updatePage: vi.fn(),
    deleteBoard: vi.fn(),
    deletePage: vi.fn(),
    listWords: vi.fn(),
  }
})

const preferences: vocabularyApi.BoardPreferences = { hiddenColumns: [], columnOrder: [...vocabularyApi.DEFAULT_VOCAB_COLUMN_ORDER], columnWidths: {} }
const newestBoard: vocabularyApi.BoardDetail = {
  id: 'board-new', name: 'Newest board', language: 'en', pageCount: 1, createdAt: '2026-07-13T00:00:00Z', updatedAt: '2026-07-13T00:00:00Z', preferences,
  pages: [
    { id: 'page-new', boardId: 'board-new', name: 'Newest page', createdAt: '2026-07-13T00:00:00Z', updatedAt: '2026-07-13T00:00:00Z' },
    { id: 'page-earlier', boardId: 'board-new', name: 'Earlier page', createdAt: '2026-07-12T00:00:00Z', updatedAt: '2026-07-12T00:00:00Z' },
  ],
}
const olderBoard: vocabularyApi.BoardDetail = {
  id: 'board-old', name: 'Older board', language: 'en', pageCount: 1, createdAt: '2026-07-12T00:00:00Z', updatedAt: '2026-07-12T00:00:00Z', preferences,
  pages: [{ id: 'page-old', boardId: 'board-old', name: 'Older page', createdAt: '2026-07-12T00:00:00Z', updatedAt: '2026-07-12T00:00:00Z' }],
}
const createdBoard: vocabularyApi.BoardDetail = {
  id: 'board-created', name: 'Expressions', language: 'en', pageCount: 0, createdAt: '2026-07-14T00:00:00Z', updatedAt: '2026-07-14T00:00:00Z', preferences, pages: [],
}
const createdPage: vocabularyApi.Page = {
  id: 'page-created', boardId: newestBoard.id, name: 'Fresh page', createdAt: '2026-07-14T00:00:00Z', updatedAt: '2026-07-14T00:00:00Z',
}

function renderWorkspace() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Number.POSITIVE_INFINITY } } })
  client.setQueryData(['vocab', 'boards'], [newestBoard, olderBoard])
  client.setQueryData(['vocab', 'boards', newestBoard.id], newestBoard)
  client.setQueryData(['vocab', 'boards', olderBoard.id], olderBoard)
  return render(<AppProviders queryClient={client}><MemoryRouter><WorkspacePage /></MemoryRouter></AppProviders>)
}

describe('WorkspacePage board and page context actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(vocabularyApi.deleteBoard).mockResolvedValue({ id: 'trash-board' } as never)
    vi.mocked(vocabularyApi.deletePage).mockResolvedValue({ id: 'trash-page' } as never)
    vi.mocked(vocabularyApi.listWords).mockResolvedValue([])
    vi.mocked(vocabularyApi.listBoards).mockResolvedValue([newestBoard, olderBoard])
    vi.mocked(vocabularyApi.getBoard).mockImplementation(async (boardId) => {
      if (boardId === createdBoard.id) return createdBoard
      if (boardId === olderBoard.id) return olderBoard
      return newestBoard
    })
    vi.mocked(vocabularyApi.createBoard).mockResolvedValue(createdBoard)
    vi.mocked(vocabularyApi.createPage).mockResolvedValue(createdPage)
  })

  it('keeps Add page before every Page in the active Board', async () => {
    renderWorkspace()

    const addPage = await screen.findByRole('button', { name: 'Add page' })
    const newestPage = screen.getByRole('button', { name: 'Newest page' })
    const earlierPage = screen.getByRole('button', { name: 'Earlier page' })

    expect(addPage.compareDocumentPosition(newestPage) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(addPage.compareDocumentPosition(earlierPage) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('ellipsizes long Board and Page labels without changing their accessible names', async () => {
    renderWorkspace()

    const boardButton = await screen.findByRole('button', { name: /Newest board/ })
    const pageButton = screen.getByRole('button', { name: 'Newest page' })

    expect(boardButton).toHaveClass('min-w-0', 'overflow-hidden')
    expect(within(boardButton).getByText('Newest board')).toHaveClass('min-w-0', 'flex-1', 'truncate')
    expect(pageButton).toHaveClass('min-w-0', 'overflow-hidden')
    expect(within(pageButton).getByText('Newest page')).toHaveClass('min-w-0', 'flex-1', 'truncate')
  })

  it('creates a Board from a modal and Escape cancels without a request', async () => {
    const user = userEvent.setup()
    renderWorkspace()

    expect(screen.queryByLabelText('Board name')).not.toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: 'Create new board' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Create board')
    fireEvent.change(screen.getByLabelText('Board name'), { target: { value: 'Ignored board' } })
    await user.keyboard('{Escape}')
    expect(vocabularyApi.createBoard).not.toHaveBeenCalled()
    expect(screen.queryByLabelText('Board name')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Create new board' }))
    fireEvent.change(screen.getByLabelText('Board name'), { target: { value: '  Expressions  ' } })
    await user.click(screen.getByRole('button', { name: 'Create board' }))

    await waitFor(() => expect(vocabularyApi.createBoard).toHaveBeenCalledWith(
      { name: 'Expressions', language: 'en' },
      expect.anything(),
    ))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('creates a Page from a modal and Cancel makes no request', async () => {
    const user = userEvent.setup()
    vi.mocked(vocabularyApi.getBoard).mockImplementation(async (boardId) => boardId === newestBoard.id
      ? { ...newestBoard, pageCount: 3, pages: [createdPage, ...newestBoard.pages] }
      : olderBoard)
    renderWorkspace()

    expect(screen.queryByLabelText('Page name')).not.toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: 'Add page' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Add a vocabulary page to “Newest board”.')
    fireEvent.change(screen.getByLabelText('Page name'), { target: { value: 'Ignored page' } })
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(vocabularyApi.createPage).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Add page' }))
    fireEvent.change(screen.getByLabelText('Page name'), { target: { value: '  Fresh page  ' } })
    await user.click(screen.getByRole('button', { name: 'Create page' }))

    await waitFor(() => expect(vocabularyApi.createPage).toHaveBeenCalledWith('board-new', { name: 'Fresh page' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('moves the exact right-clicked Board to Trash and selects the newest replacement', async () => {
    const user = userEvent.setup()
    renderWorkspace()

    const boardButton = await screen.findByRole('button', { name: /Newest board/ })
    fireEvent.contextMenu(boardButton)
    await user.click(await screen.findByRole('menuitem', { name: 'Delete Board' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    await waitFor(() => expect(vocabularyApi.deleteBoard).toHaveBeenCalledWith('board-new'))
    expect(await screen.findByRole('heading', { name: 'Older page' })).toBeInTheDocument()
  })

  it('deletes the exact Page and selects the next newest Page', async () => {
    const user = userEvent.setup()
    renderWorkspace()

    const pageButton = await screen.findByRole('button', { name: 'Newest page' })
    fireEvent.contextMenu(pageButton)
    await user.click(await screen.findByRole('menuitem', { name: 'Delete Page' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()

    await waitFor(() => expect(vocabularyApi.deletePage).toHaveBeenCalledWith('board-new', 'page-new'))
    expect(await screen.findByRole('heading', { name: 'Earlier page' })).toBeInTheDocument()
  })

  it('renames the exact right-clicked Board and preserves its language', async () => {
    const user = userEvent.setup()
    vi.mocked(vocabularyApi.updateBoard).mockResolvedValue({ ...newestBoard, name: 'Renamed board' })
    renderWorkspace()

    fireEvent.contextMenu(await screen.findByRole('button', { name: /Newest board/ }))
    await user.click(await screen.findByRole('menuitem', { name: 'Rename Board' }))
    const input = screen.getByLabelText('Board name')
    await user.clear(input)
    await user.type(input, 'Renamed board')
    await user.click(screen.getByRole('button', { name: 'Rename' }))

    await waitFor(() => expect(vocabularyApi.updateBoard).toHaveBeenCalledWith('board-new', { name: 'Renamed board', language: 'en' }))
    expect(await screen.findByRole('button', { name: /Renamed board/ })).toBeInTheDocument()
  })

  it('shows each Board language beside its Page count instead of in the header', async () => {
    renderWorkspace()

    const newestBoardButton = await screen.findByRole('button', { name: /Newest board/ })
    expect(newestBoardButton).toHaveTextContent('1en')
    expect(screen.getAllByText('en')[0]).toHaveClass('uppercase')
    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
  })

  it('renames the exact right-clicked Page', async () => {
    const user = userEvent.setup()
    vi.mocked(vocabularyApi.updatePage).mockResolvedValue({ ...newestBoard.pages[0], name: 'Renamed page' })
    renderWorkspace()

    fireEvent.contextMenu(await screen.findByRole('button', { name: 'Newest page' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Rename Page' }))
    const input = screen.getByLabelText('Page name')
    await user.clear(input)
    await user.type(input, 'Renamed page')
    await user.click(screen.getByRole('button', { name: 'Rename' }))

    await waitFor(() => expect(vocabularyApi.updatePage).toHaveBeenCalledWith('board-new', 'page-new', { name: 'Renamed page' }))
    expect(await screen.findByRole('button', { name: 'Renamed page' })).toBeInTheDocument()
  })
})
