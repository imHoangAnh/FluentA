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
    updateBoardPreferences: vi.fn(),
  }
})

const preferences: vocabularyApi.BoardPreferences = { hiddenColumns: [], columnOrder: [...vocabularyApi.DEFAULT_VOCAB_COLUMN_ORDER], columnWidths: {} }
const newestBoard: vocabularyApi.BoardDetail = {
  id: 'board-new', name: 'Newest board', language: 'en', pageCount: 2, createdAt: '2026-07-13T00:00:00Z', updatedAt: '2026-07-13T00:00:00Z', preferences,
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
  return { client, ...render(<AppProviders queryClient={client}><MemoryRouter><WorkspacePage /></MemoryRouter></AppProviders>) }
}

describe('WorkspacePage board and page context actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
    vi.mocked(vocabularyApi.deleteBoard).mockResolvedValue({ deleted: true } as never)
    vi.mocked(vocabularyApi.deletePage).mockResolvedValue({ deleted: true } as never)
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

  it('keeps Add page before every Page in the active Board and omits word counts', async () => {
    renderWorkspace()

    const addPage = await screen.findByRole('button', { name: 'New page' })
    const newestPage = screen.getByRole('tab', { name: 'Newest page' })
    const earlierPage = screen.getByRole('tab', { name: 'Earlier page' })

    expect(addPage.compareDocumentPosition(newestPage) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(addPage.compareDocumentPosition(earlierPage) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.queryByText(/\b\d+\s+Words?\b/i)).not.toBeInTheDocument()
    expect(within(newestPage).queryByText(/^\d+$/)).not.toBeInTheDocument()
  })

  it('ellipsizes long Board and Page labels without changing their accessible names', async () => {
    renderWorkspace()

    const boardButton = await screen.findByRole('tab', { name: /Newest board/ })
    const pageButton = screen.getByRole('tab', { name: 'Newest page' })

    expect(boardButton).toHaveClass('min-w-0')
    expect(within(boardButton).getByText('Newest board')).toHaveClass('truncate')
    expect(pageButton).toHaveClass('min-w-0')
    expect(within(pageButton).getByText('Newest page')).toHaveClass('truncate')
  })

  it('creates a Board from a modal and Escape cancels without a request', async () => {
    const user = userEvent.setup()
    renderWorkspace()

    expect(screen.queryByLabelText('Board name')).not.toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: 'New board' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Create board')
    fireEvent.change(screen.getByLabelText('Board name'), { target: { value: 'Ignored board' } })
    await user.keyboard('{Escape}')
    expect(vocabularyApi.createBoard).not.toHaveBeenCalled()
    expect(screen.queryByLabelText('Board name')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'New board' }))
    fireEvent.change(screen.getByLabelText('Board name'), { target: { value: '  Expressions  ' } })
    await user.click(screen.getByRole('button', { name: 'Create board' }))

    await waitFor(() => expect(vocabularyApi.createBoard).toHaveBeenCalledWith(
      { name: 'Expressions', language: 'en', includedOptionalColumns: [] },
      expect.anything(),
    ))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('creates a Page from a modal and Cancel makes no request', async () => {
    const user = userEvent.setup()
    vi.mocked(vocabularyApi.getBoard).mockImplementation(async (boardId) => (boardId === newestBoard.id
      ? { ...newestBoard, pageCount: 3, pages: [createdPage, ...newestBoard.pages] }
      : olderBoard))
    renderWorkspace()

    expect(screen.queryByLabelText('Page name')).not.toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: 'New page' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Add a vocabulary page to “Newest board”.')
    fireEvent.change(screen.getByLabelText('Page name'), { target: { value: 'Ignored page' } })
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(vocabularyApi.createPage).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'New page' }))
    fireEvent.change(screen.getByLabelText('Page name'), { target: { value: '  Fresh page  ' } })
    await user.click(screen.getByRole('button', { name: 'Create page' }))

    await waitFor(() => expect(vocabularyApi.createPage).toHaveBeenCalledWith('board-new', { name: 'Fresh page' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('creates a Page inside another Board from its sidebar plus button', async () => {
    const user = userEvent.setup()
    const olderCreatedPage: vocabularyApi.Page = {
      id: 'page-older-created', boardId: olderBoard.id, name: 'Travel idioms', createdAt: '2026-07-15T00:00:00Z', updatedAt: '2026-07-15T00:00:00Z',
    }
    vi.mocked(vocabularyApi.createPage).mockResolvedValue(olderCreatedPage)
    vi.mocked(vocabularyApi.getBoard).mockImplementation(async (boardId) => (boardId === olderBoard.id
      ? { ...olderBoard, pageCount: 2, pages: [olderCreatedPage, ...olderBoard.pages] }
      : newestBoard))
    renderWorkspace()

    await user.click(await screen.findByRole('button', { name: 'New page in Older board' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Add a vocabulary page to “Older board”.')
    fireEvent.change(screen.getByLabelText('Page name'), { target: { value: 'Travel idioms' } })
    await user.click(screen.getByRole('button', { name: 'Create page' }))

    await waitFor(() => expect(vocabularyApi.createPage).toHaveBeenCalledWith('board-old', { name: 'Travel idioms' }))
    expect(await screen.findByRole('heading', { name: 'Travel idioms' })).toBeInTheDocument()
  })

  it('deletes the exact right-clicked Board and selects the newest replacement', async () => {
    const user = userEvent.setup()
    renderWorkspace()

    const boardButton = await screen.findByRole('tab', { name: /Newest board/ })
    fireEvent.contextMenu(boardButton)
    expect(await screen.findByRole('menuitem', { name: 'Rename' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Setting' })).toBeInTheDocument()
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }))

    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(vocabularyApi.deleteBoard).not.toHaveBeenCalled()
    expect(vocabularyApi.deletePage).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: /^Delete$/ }))
    await waitFor(() => expect(vocabularyApi.deleteBoard).toHaveBeenCalledWith('board-new'))
    expect(await screen.findByRole('heading', { name: 'Older page' })).toBeInTheDocument()
  })

  it('deletes the exact Page and selects the next newest Page', async () => {
    const user = userEvent.setup()
    renderWorkspace()

    const pageButton = await screen.findByRole('tab', { name: 'Newest page' })
    fireEvent.contextMenu(pageButton)
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(vocabularyApi.deleteBoard).not.toHaveBeenCalled()
    expect(vocabularyApi.deletePage).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: /^Delete$/ }))

    await waitFor(() => expect(vocabularyApi.deletePage).toHaveBeenCalledWith('page-new'))
    expect(await screen.findByRole('heading', { name: 'Earlier page' })).toBeInTheDocument()
  })

  it('renames the exact right-clicked Board and preserves its language', async () => {
    const user = userEvent.setup()
    vi.mocked(vocabularyApi.updateBoard).mockResolvedValue({ ...newestBoard, name: 'Renamed board' })
    renderWorkspace()

    fireEvent.contextMenu(await screen.findByRole('tab', { name: /Newest board/ }))
    await user.click(await screen.findByRole('menuitem', { name: 'Rename' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Rename Board')
    const input = screen.getByLabelText('Board name')
    await user.clear(input)
    await user.type(input, 'Renamed board')
    await user.click(screen.getByRole('button', { name: 'Rename' }))

    await waitFor(() => expect(vocabularyApi.updateBoard).toHaveBeenCalledWith('board-new', { name: 'Renamed board', language: 'en' }))
    expect(await screen.findByRole('tab', { name: /Renamed board/ })).toBeInTheDocument()
  })

  it('updates board columns and language from the Setting modal', async () => {
    const user = userEvent.setup()
    vi.mocked(vocabularyApi.updateBoard).mockResolvedValue({
      ...newestBoard,
      preferences: { ...preferences, hiddenColumns: ['context'] },
    })
    renderWorkspace()

    fireEvent.contextMenu(await screen.findByRole('tab', { name: /Newest board/ }))
    await user.click(await screen.findByRole('menuitem', { name: 'Setting' }))

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('Board settings')
    expect(dialog).toHaveTextContent('Choose which columns are shown in “Newest board”.')

    const contextCheckbox = within(dialog).getByLabelText('Context')
    expect(contextCheckbox).toBeChecked()
    await user.click(contextCheckbox)
    expect(contextCheckbox).not.toBeChecked()

    await user.click(within(dialog).getByRole('button', { name: 'Save settings' }))

    await waitFor(() => expect(vocabularyApi.updateBoard).toHaveBeenCalledWith('board-new', {
      name: 'Newest board',
      language: 'en',
      includedOptionalColumns: ['synonyms', 'antonyms'],
    }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('keeps the board name accessible as a selectable tab', async () => {
    renderWorkspace()
    expect(await screen.findByRole('tab', { name: 'Newest board' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Older board' })).toHaveAttribute('aria-selected', 'false')
  })

  it('renames the exact right-clicked Page', async () => {
    const user = userEvent.setup()
    vi.mocked(vocabularyApi.updatePage).mockResolvedValue({ ...newestBoard.pages[0], name: 'Renamed page' })
    renderWorkspace()

    fireEvent.contextMenu(await screen.findByRole('tab', { name: 'Newest page' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Rename' }))
    const input = screen.getByLabelText('Page name')
    await user.clear(input)
    await user.type(input, 'Renamed page')
    await user.click(screen.getByRole('button', { name: 'Rename' }))

    await waitFor(() => expect(vocabularyApi.updatePage).toHaveBeenCalledWith('page-new', { name: 'Renamed page' }))
    expect(await screen.findByRole('tab', { name: 'Renamed page' })).toBeInTheDocument()
  })

  it('keeps add drafts separate when switching actual page tabs', async () => {
    renderWorkspace()
    const user = userEvent.setup()
    await user.click(await screen.findByTestId('add-vocabulary-row-trigger'))
    await user.type(screen.getByLabelText('Word for new word'), 'page A draft')
    await user.click(screen.getByRole('tab', { name: 'Earlier page' }))
    expect(await screen.findByTestId('add-vocabulary-row-trigger')).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Newest page' }))
    expect(await screen.findByLabelText('Word for new word')).toHaveValue('page A draft')
  })

  it('a delayed preference save updates the original board after changing boards', async () => {
    let resolve!: (preferences: vocabularyApi.BoardPreferences) => void
    vi.mocked(vocabularyApi.updateBoardPreferences).mockImplementation(() => new Promise((r) => { resolve = r }))
    const { client } = renderWorkspace()
    fireEvent.mouseDown(await screen.findByLabelText('Resize Word'), { clientX: 100 })
    fireEvent.mouseMove(window, { clientX: 180 })
    fireEvent.mouseUp(window)
    await waitFor(() => expect(vocabularyApi.updateBoardPreferences).toHaveBeenCalled())
    await userEvent.setup().click(screen.getByRole('tab', { name: 'Older board' }))
    resolve({ ...preferences, columnWidths: { word: 300 } })
    await waitFor(() => expect(client.getQueryData<vocabularyApi.BoardDetail>(['vocab', 'boards', 'board-new'])?.preferences.columnWidths.word).toBe(300))
    expect(client.getQueryData<vocabularyApi.BoardDetail>(['vocab', 'boards', 'board-old'])?.preferences.columnWidths).toEqual({})
  })

  it('collapses and expands the Boards Rail sidebar and persists state in sessionStorage', async () => {
    const user = userEvent.setup()
    renderWorkspace()

    const rail = await screen.findByTestId('vocabulary-boards-rail')
    expect(rail).toHaveAttribute('data-collapsed', 'false')
    expect(screen.getByRole('tab', { name: 'Newest page' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Collapse sidebar' }))

    expect(rail).toHaveAttribute('data-collapsed', 'true')
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Newest page' })).not.toBeInTheDocument()
    expect(sessionStorage.getItem('fluenta:vocabulary:sidebar-collapsed')).toBe('true')

    await user.click(screen.getByRole('tab', { name: 'Older board' }))
    expect(await screen.findByRole('heading', { name: 'Older page' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Expand sidebar' }))

    expect(rail).toHaveAttribute('data-collapsed', 'false')
    expect(await screen.findByRole('tab', { name: 'Older page' })).toBeInTheDocument()
    expect(sessionStorage.getItem('fluenta:vocabulary:sidebar-collapsed')).toBe('false')
  })
})
