import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { WorkspacePage } from '@/features/vocabulary/pages/WorkspacePage'
import * as vocabularyApi from '@/features/vocabulary/api/vocabulary.api'
import { AppProviders } from '@/app/providers'

vi.mock('@/features/vocabulary/api/vocabulary.api', async () => {
  const actual = await vi.importActual<typeof import('@/features/vocabulary/api/vocabulary.api')>('@/features/vocabulary/api/vocabulary.api')
  return { ...actual, updateBoard: vi.fn(), updatePage: vi.fn(), deleteBoard: vi.fn(), deletePage: vi.fn(), listWords: vi.fn() }
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
    vi.mocked(vocabularyApi.deleteBoard).mockResolvedValue(undefined)
    vi.mocked(vocabularyApi.deletePage).mockResolvedValue(undefined)
    vi.mocked(vocabularyApi.listWords).mockResolvedValue([])
  })

  it('confirms the exact right-clicked Board, preserves it on Cancel, then selects the newest replacement after Delete', async () => {
    const user = userEvent.setup()
    renderWorkspace()

    const boardButton = await screen.findByRole('button', { name: /Newest board/ })
    fireEvent.contextMenu(boardButton)
    await user.click(await screen.findByRole('menuitem', { name: 'Delete Board' }))

    expect(screen.getByRole('alertdialog')).toHaveTextContent('Delete “Newest board”?')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(vocabularyApi.deleteBoard).not.toHaveBeenCalled()
    expect(boardButton).toBeInTheDocument()

    fireEvent.contextMenu(boardButton)
    await user.click(await screen.findByRole('menuitem', { name: 'Delete Board' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(vocabularyApi.deleteBoard).toHaveBeenCalledWith('board-new'))
    expect(await screen.findByRole('heading', { name: 'Older page' })).toBeInTheDocument()
  })

  it('deletes the exact Page and selects the next newest Page', async () => {
    const user = userEvent.setup()
    renderWorkspace()

    const pageButton = await screen.findByRole('button', { name: 'Newest page' })
    fireEvent.contextMenu(pageButton)
    await user.click(await screen.findByRole('menuitem', { name: 'Delete Page' }))
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Delete “Newest page”?')
    await user.click(screen.getByRole('button', { name: 'Delete' }))

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
