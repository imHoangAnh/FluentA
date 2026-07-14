import { render, screen, waitFor } from '@testing-library/react'
import { fireEvent } from '@testing-library/react'
import { QueryClient } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as assetsApi from '@/lib/api/assets.api'
import * as noteApi from '../api/note.api'
import { useAuthStore } from '@/features/auth'
import { AppProviders } from '@/app/providers'
import { NotesPage } from './NotesPage'

vi.mock('../api/note.api', async () => {
  const actual = await vi.importActual<typeof import('../api/note.api')>('../api/note.api')
  return {
    ...actual,
    listBoards: vi.fn(),
    createBoard: vi.fn(),
    createPage: vi.fn(),
    getPage: vi.fn(),
    updatePage: vi.fn(),
  }
})

vi.mock('@/lib/api/assets.api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/assets.api')>('@/lib/api/assets.api')
  return {
    ...actual,
    uploadNoteImageAsset: vi.fn(),
  }
})

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return render(
    <AppProviders queryClient={queryClient}>
      <MemoryRouter initialEntries={['/notes']}>
        <NotesPage />
      </MemoryRouter>
    </AppProviders>,
  )
}

describe('NotesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({
      accessToken: 'notes-token',
      status: 'authenticated',
      user: {
        id: 'user-1',
        email: 'learner@example.com',
        fullName: 'FluentA Learner',
        isEmailVerified: true,
      },
    })
    vi.mocked(noteApi.listBoards).mockResolvedValue([])
    vi.mocked(noteApi.updatePage).mockResolvedValue({
      id: 'page-1',
      boardId: 'board-1',
      name: 'Week 1 reflections',
      content: '',
      date: '2026-07-09',
      createdAt: '2026-07-09T09:05:00Z',
      updatedAt: '2026-07-09T09:05:00Z',
    })
    vi.mocked(assetsApi.uploadNoteImageAsset).mockResolvedValue({
      id: 'asset-1',
      assetType: 'note-image',
      status: 'finalized',
      publicUrl: 'https://cdn.example.com/note-image.png',
      contentType: 'image/png',
      sizeBytes: 512,
      createdAtUtc: '2026-07-09T09:05:00Z',
      updatedAtUtc: '2026-07-09T09:05:00Z',
      expiresAtUtc: null,
    })
  })

  it('renders the empty state when no boards exist', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: 'No note boards yet' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create your first board' })).toBeInTheDocument()
  })

  it('creates a board, creates a page, and opens the new page immediately', async () => {
    const user = userEvent.setup()

    vi.mocked(noteApi.listBoards)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{
        id: 'board-1',
        name: 'Learning Notes',
        pages: [],
        createdAt: '2026-07-09T09:00:00Z',
        updatedAt: '2026-07-09T09:00:00Z',
      }])
      .mockResolvedValueOnce([{
        id: 'board-1',
        name: 'Learning Notes',
        createdAt: '2026-07-09T09:00:00Z',
        updatedAt: '2026-07-09T09:05:00Z',
        pages: [{
          id: 'page-1',
          boardId: 'board-1',
          name: 'Week 1 reflections',
          date: '2026-07-09',
          createdAt: '2026-07-09T09:05:00Z',
          updatedAt: '2026-07-09T09:05:00Z',
        }],
      }])

    vi.mocked(noteApi.createBoard).mockResolvedValue({
      id: 'board-1',
      name: 'Learning Notes',
      pages: [],
      createdAt: '2026-07-09T09:00:00Z',
      updatedAt: '2026-07-09T09:00:00Z',
    })
    vi.mocked(noteApi.createPage).mockResolvedValue({
      id: 'page-1',
      boardId: 'board-1',
      name: 'Week 1 reflections',
      content: '',
      date: '2026-07-09',
      createdAt: '2026-07-09T09:05:00Z',
      updatedAt: '2026-07-09T09:05:00Z',
    })

    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Create your first board' }))
    await user.type(screen.getByLabelText('Board name'), 'Learning Notes')
    await user.click(screen.getByRole('button', { name: 'Create board' }))

    expect(await screen.findByRole('heading', { name: 'Learning Notes' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Create first page' }))
    await user.type(screen.getByLabelText('Page name'), 'Week 1 reflections')
    await user.click(screen.getByRole('button', { name: 'Create page' }))

    await waitFor(() => expect(noteApi.createPage).toHaveBeenCalledWith('board-1', { name: 'Week 1 reflections' }))
    expect(await screen.findByDisplayValue('Week 1 reflections')).toBeInTheDocument()
    expect(screen.getByTestId('note-save-status')).toHaveTextContent('Saved')
  })

  it('loads page detail when a page is selected', async () => {
    const user = userEvent.setup()

    vi.mocked(noteApi.listBoards).mockResolvedValue([{
      id: 'board-1',
      name: 'Learning Notes',
      createdAt: '2026-07-09T09:00:00Z',
      updatedAt: '2026-07-09T09:00:00Z',
      pages: [
        {
          id: 'page-1',
          boardId: 'board-1',
          name: 'Week 1 reflections',
          date: '2026-07-09',
          createdAt: '2026-07-09T09:00:00Z',
          updatedAt: '2026-07-09T09:00:00Z',
        },
        {
          id: 'page-2',
          boardId: 'board-1',
          name: 'Practice recap',
          date: '2026-07-10',
          createdAt: '2026-07-10T09:00:00Z',
          updatedAt: '2026-07-10T10:00:00Z',
        },
      ],
    }])
    vi.mocked(noteApi.getPage).mockImplementation(async (pageId: string) => ({
      id: pageId,
      boardId: 'board-1',
      name: pageId === 'page-2' ? 'Practice recap' : 'Week 1 reflections',
      content: pageId === 'page-2' ? '<p>Saved content</p>' : '',
      date: pageId === 'page-2' ? '2026-07-10' : '2026-07-09',
      createdAt: '2026-07-10T09:00:00Z',
      updatedAt: '2026-07-10T10:00:00Z',
    }))

    renderPage()

    expect(await screen.findByDisplayValue('Practice recap')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Week 1 reflections' }))

    await waitFor(() => expect(noteApi.getPage).toHaveBeenCalledWith('page-1'))
    expect(await screen.findByDisplayValue('Week 1 reflections')).toBeInTheDocument()
    expect(screen.getByTestId('note-save-status')).toHaveTextContent('Saved')
  })

  it('saves the current draft on blur', async () => {
    const user = userEvent.setup()

    vi.mocked(noteApi.listBoards).mockResolvedValue([{
      id: 'board-1',
      name: 'Learning Notes',
      createdAt: '2026-07-09T09:00:00Z',
      updatedAt: '2026-07-09T09:00:00Z',
      pages: [{
        id: 'page-1',
        boardId: 'board-1',
        name: 'Week 1 reflections',
        date: '2026-07-09',
        createdAt: '2026-07-09T09:00:00Z',
        updatedAt: '2026-07-09T09:00:00Z',
      }],
    }])
    vi.mocked(noteApi.getPage).mockResolvedValue({
      id: 'page-1',
      boardId: 'board-1',
      name: 'Week 1 reflections',
      content: '<p>Saved content</p>',
      date: '2026-07-09',
      createdAt: '2026-07-09T09:00:00Z',
      updatedAt: '2026-07-09T09:00:00Z',
    })
    vi.mocked(noteApi.updatePage).mockResolvedValue({
      id: 'page-1',
      boardId: 'board-1',
      name: 'Updated reflections',
      content: '<p>Saved content</p>',
      date: '2026-07-09',
      createdAt: '2026-07-09T09:00:00Z',
      updatedAt: '2026-07-09T09:10:00Z',
    })

    renderPage()

    const titleInput = await screen.findByLabelText('Note title')
    await user.clear(titleInput)
    await user.type(titleInput, 'Updated reflections')

    expect(screen.getByTestId('note-save-status')).toHaveTextContent('Unsaved changes')
    await user.tab()

    await waitFor(() => expect(noteApi.updatePage).toHaveBeenCalledWith('page-1', {
      name: 'Updated reflections',
      content: '<p>Saved content</p>',
    }))
    expect(await screen.findByTestId('note-save-status')).toHaveTextContent('Saved')
  })

  it('saves before switching pages and keeps the draft when save fails', async () => {
    const user = userEvent.setup()

    vi.mocked(noteApi.listBoards).mockResolvedValue([{
      id: 'board-1',
      name: 'Learning Notes',
      createdAt: '2026-07-09T09:00:00Z',
      updatedAt: '2026-07-09T09:00:00Z',
      pages: [
        {
          id: 'page-1',
          boardId: 'board-1',
          name: 'Week 1 reflections',
          date: '2026-07-09',
          createdAt: '2026-07-09T09:00:00Z',
          updatedAt: '2026-07-09T09:00:00Z',
        },
        {
          id: 'page-2',
          boardId: 'board-1',
          name: 'Practice recap',
          date: '2026-07-10',
          createdAt: '2026-07-10T09:00:00Z',
          updatedAt: '2026-07-10T09:00:00Z',
        },
      ],
    }])
    vi.mocked(noteApi.getPage).mockImplementation(async (pageId: string) => ({
      id: pageId,
      boardId: 'board-1',
      name: pageId === 'page-2' ? 'Practice recap' : 'Week 1 reflections',
      content: pageId === 'page-2' ? '<p>Page two</p>' : '<p>Page one</p>',
      date: pageId === 'page-2' ? '2026-07-10' : '2026-07-09',
      createdAt: '2026-07-10T09:00:00Z',
      updatedAt: '2026-07-10T09:00:00Z',
    }))
    vi.mocked(noteApi.updatePage)
      .mockRejectedValueOnce(new Error('save failed'))
      .mockResolvedValueOnce({
        id: 'page-1',
        boardId: 'board-1',
        name: 'Edited page one',
        content: '<p>Page one</p>',
        date: '2026-07-09',
        createdAt: '2026-07-09T09:00:00Z',
        updatedAt: '2026-07-09T09:12:00Z',
      })

    renderPage()

    await screen.findByDisplayValue('Practice recap')
    await user.click(screen.getByRole('button', { name: 'Week 1 reflections' }))

    const titleInput = await screen.findByLabelText('Note title')
    await user.clear(titleInput)
    await user.type(titleInput, 'Edited page one')
    await user.click(screen.getByRole('button', { name: 'Practice recap' }))

    await waitFor(() => expect(noteApi.updatePage).toHaveBeenCalledTimes(1))
    expect(screen.getByLabelText('Note title')).toHaveValue('Edited page one')
    expect(screen.getByTestId('note-save-status')).toHaveTextContent('Save failed')
    expect(screen.queryByDisplayValue('Practice recap')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Practice recap' }))

    await waitFor(() => expect(noteApi.updatePage).toHaveBeenCalledTimes(2))
    expect(await screen.findByDisplayValue('Practice recap')).toBeInTheDocument()
  })

  it('uploads a dropped note image and persists a durable asset reference on save', async () => {
    const user = userEvent.setup()
    const file = new File(['png'], 'diagram.png', { type: 'image/png' })

    vi.mocked(noteApi.listBoards).mockResolvedValue([{
      id: 'board-1',
      name: 'Learning Notes',
      createdAt: '2026-07-09T09:00:00Z',
      updatedAt: '2026-07-09T09:00:00Z',
      pages: [{
        id: 'page-1',
        boardId: 'board-1',
        name: 'Week 1 reflections',
        date: '2026-07-09',
        createdAt: '2026-07-09T09:00:00Z',
        updatedAt: '2026-07-09T09:00:00Z',
      }],
    }])
    vi.mocked(noteApi.getPage).mockResolvedValue({
      id: 'page-1',
      boardId: 'board-1',
      name: 'Week 1 reflections',
      content: '<p>Saved content</p>',
      date: '2026-07-09',
      createdAt: '2026-07-09T09:00:00Z',
      updatedAt: '2026-07-09T09:00:00Z',
    })
    vi.mocked(noteApi.updatePage).mockResolvedValue({
      id: 'page-1',
      boardId: 'board-1',
      name: 'Week 1 reflections',
      content: '<p>Saved content</p><p><img src="https://cdn.example.com/note-image.png" alt="diagram.png" data-note-asset-id="asset-1"></p>',
      date: '2026-07-09',
      createdAt: '2026-07-09T09:00:00Z',
      updatedAt: '2026-07-09T09:10:00Z',
    })

    renderPage()

    const editor = await screen.findByLabelText('Journal rich text editor')
    fireEvent.drop(editor, {
      dataTransfer: {
        files: [file],
      },
    })

    await waitFor(() => expect(assetsApi.uploadNoteImageAsset).toHaveBeenCalledWith(file))
    expect(screen.getByTestId('note-save-status')).toHaveTextContent('Unsaved changes')

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(noteApi.updatePage).toHaveBeenCalledWith('page-1', {
      name: 'Week 1 reflections',
      content: '<p>Saved content</p><p><img src="https://cdn.example.com/note-image.png" alt="diagram.png" data-note-asset-id="asset-1"></p>',
    }))
    expect(await screen.findByTestId('note-save-status')).toHaveTextContent('Saved')
  })

  it('shows a clear error when note image upload fails', async () => {
    vi.mocked(noteApi.listBoards).mockResolvedValue([{
      id: 'board-1',
      name: 'Learning Notes',
      createdAt: '2026-07-09T09:00:00Z',
      updatedAt: '2026-07-09T09:00:00Z',
      pages: [{
        id: 'page-1',
        boardId: 'board-1',
        name: 'Week 1 reflections',
        date: '2026-07-09',
        createdAt: '2026-07-09T09:00:00Z',
        updatedAt: '2026-07-09T09:00:00Z',
      }],
    }])
    vi.mocked(noteApi.getPage).mockResolvedValue({
      id: 'page-1',
      boardId: 'board-1',
      name: 'Week 1 reflections',
      content: '<p>Saved content</p>',
      date: '2026-07-09',
      createdAt: '2026-07-09T09:00:00Z',
      updatedAt: '2026-07-09T09:00:00Z',
    })
    vi.mocked(assetsApi.uploadNoteImageAsset).mockRejectedValueOnce(new Error('Note image upload could not be completed.'))

    renderPage()

    const editor = await screen.findByLabelText('Journal rich text editor')
    fireEvent.paste(editor, {
      clipboardData: {
        files: [new File(['png'], 'diagram.png', { type: 'image/png' })],
      },
    })

    expect(await screen.findByText('Note image upload could not be completed.')).toBeInTheDocument()
    expect(screen.getByTestId('note-save-status')).toHaveTextContent('Save failed')
  })
})
