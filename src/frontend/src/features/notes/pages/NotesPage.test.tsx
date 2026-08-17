import { render, screen, waitFor, within } from '@testing-library/react'
import { fireEvent } from '@testing-library/react'
import { QueryClient } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as assetsApi from '@/features/assets'
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
    updateBoard: vi.fn(),
    deleteBoard: vi.fn(),
    createPage: vi.fn(),
    getPage: vi.fn(),
    updatePage: vi.fn(),
    deletePage: vi.fn(),
  }
})

vi.mock('@/features/assets', async () => {
  const actual = await vi.importActual<typeof import('@/features/assets')>('@/features/assets')
  return {
    ...actual,
    uploadAsset: vi.fn(),
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
    Reflect.deleteProperty(document, 'execCommand')
    useAuthStore.setState({
      status: 'authenticated',
      user: {
        id: 'user-1',
        email: 'learner@example.com',
        fullName: 'FluentA Learner',
        isEmailVerified: true,
      },
    })
    vi.mocked(noteApi.listBoards).mockResolvedValue([])
    vi.mocked(noteApi.deleteBoard).mockResolvedValue({
      id: 'trash-board-1', entityKind: 'Note', entityId: 'board-1', displayName: 'Learning Notes', originalLocation: 'Notes',
      trashedAt: '2026-07-09T10:00:00Z', purgeAfterAt: '2026-08-08T10:00:00Z',
    })
    vi.mocked(noteApi.deletePage).mockResolvedValue({
      id: 'trash-page-1', entityKind: 'Note', entityId: 'page-1', displayName: 'Week 1 reflections', originalLocation: 'Notes',
      trashedAt: '2026-07-09T10:00:00Z', purgeAfterAt: '2026-08-08T10:00:00Z',
    })
    vi.mocked(noteApi.updatePage).mockResolvedValue({
      id: 'page-1',
      boardId: 'board-1',
      name: 'Week 1 reflections',
      content: '',
      date: '2026-07-09',
      createdAt: '2026-07-09T09:05:00Z',
      updatedAt: '2026-07-09T09:05:00Z',
    })
    vi.mocked(assetsApi.uploadAsset).mockResolvedValue({
      id: 'asset-1',
      assetType: 'note-image',
      status: 'finalized',
      contentType: 'image/png',
      sizeBytes: 512,
      createdAtUtc: '2026-07-09T09:05:00Z',
      updatedAtUtc: '2026-07-09T09:05:00Z',
      expiresAtUtc: null,
    })
  })

  it('renders the empty state when no boards exist', async () => {
    renderPage()

    expect(await screen.findByText('No note boards yet')).toBeInTheDocument()
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
    vi.mocked(noteApi.getPage).mockResolvedValue({
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
    expect(screen.getByRole('dialog')).toHaveTextContent('Create board')
    await user.type(screen.getByLabelText('Board name'), 'Learning Notes')
    await user.click(screen.getByRole('button', { name: 'Create board' }))

    await waitFor(() => expect(noteApi.createBoard).toHaveBeenCalled())
    await user.click(await screen.findByRole('button', { name: 'Add page' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Add a note page to “Learning Notes”.')
    await user.type(screen.getByLabelText('Page name'), 'Week 1 reflections')
    await user.click(screen.getByRole('button', { name: 'Create page' }))

    await waitFor(() => expect(noteApi.createPage).toHaveBeenCalledWith('board-1', { name: 'Week 1 reflections' }))
    expect(await screen.findByDisplayValue('Week 1 reflections')).toBeInTheDocument()
  })

  it('loads the default page detail', async () => {
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

    await waitFor(() => expect(noteApi.getPage).toHaveBeenCalledWith('page-2'))
    expect(await screen.findByDisplayValue('Practice recap')).toBeInTheDocument()
    const pageButton = screen.getByRole('button', { name: 'Practice recap' })
    expect(pageButton).toHaveClass('min-w-0', 'overflow-hidden')
    expect(within(pageButton).getByText('Practice recap')).toHaveClass('min-w-0', 'flex-1', 'truncate')
  })

  it('keeps the formatting toolbar in the editor header and the note canvas borderless', async () => {
    const user = userEvent.setup()
    const execCommand = vi.fn(() => true)
    Object.defineProperty(document, 'execCommand', { configurable: true, value: execCommand })

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

    renderPage()

    const header = await screen.findByTestId('note-editor-header')
    const toolbar = await screen.findByRole('toolbar', { name: 'Note formatting tools' })
    const toolbarHost = screen.getByTestId('note-toolbar-host')
    const editor = screen.getByLabelText('Journal rich text editor')
    const editorShell = editor.parentElement

    expect(header).toContainElement(toolbarHost)
    expect(toolbarHost).toContainElement(toolbar)
    expect(editorShell).not.toContainElement(toolbar)
    expect(editor).toHaveClass('border-0', 'outline-none', 'focus-visible:ring-0')
    expect(editorShell).toHaveClass('border-0', 'focus-within:ring-0')

    await user.click(screen.getByRole('button', { name: 'Bold' }))
    expect(execCommand).toHaveBeenCalledWith('bold', false, undefined)
    expect(screen.getByTestId('note-save-status')).toHaveTextContent('Unsaved changes')
    Reflect.deleteProperty(document, 'execCommand')
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
    expect(screen.getByText('Jul 9, 2026')).toBeInTheDocument()
    expect(screen.queryByText(/words/i)).not.toBeInTheDocument()
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
      .mockRejectedValueOnce({
        response: {
          data: {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'The request did not pass validation.',
              details: {
                content: ['Content must be at most 100000 characters after formatting cleanup.'],
              },
            },
          },
        },
      })
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
    expect(screen.getByText('Content must be at most 100000 characters after formatting cleanup.')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('Practice recap')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Practice recap' }))

    await waitFor(() => expect(noteApi.updatePage).toHaveBeenCalledTimes(2))
    expect(await screen.findByDisplayValue('Practice recap')).toBeInTheDocument()
    expect(screen.queryByText('Content must be at most 100000 characters after formatting cleanup.')).not.toBeInTheDocument()
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

    await waitFor(() => expect(assetsApi.uploadAsset).toHaveBeenCalledWith(file, 'note-image'))
    expect(screen.getByTestId('note-save-status')).toHaveTextContent('Unsaved changes')

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(noteApi.updatePage).toHaveBeenCalledWith('page-1', {
      name: 'Week 1 reflections',
      content: expect.stringMatching(/<img src="blob:[^"]+" alt="diagram.png" data-note-asset-id="asset-1">/),
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
    vi.mocked(assetsApi.uploadAsset).mockRejectedValueOnce(new Error('Note image upload could not be completed.'))

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

  it('renames and deletes a Board from its right-click menu', async () => {
    const user = userEvent.setup()
    vi.mocked(noteApi.listBoards).mockResolvedValueOnce([{
      id: 'board-1',
      name: 'Learning Notes',
      pages: [],
      createdAt: '2026-07-09T09:00:00Z',
      updatedAt: '2026-07-09T09:00:00Z',
    }]).mockResolvedValue([])
    vi.mocked(noteApi.updateBoard).mockResolvedValue({
      id: 'board-1',
      name: 'Study Notes',
      pages: [],
      createdAt: '2026-07-09T09:00:00Z',
      updatedAt: '2026-07-09T10:00:00Z',
    })

    renderPage()

    fireEvent.contextMenu(await screen.findByRole('button', { name: /Learning Notes/ }))
    await user.click(await screen.findByRole('menuitem', { name: 'Rename Board' }))
    const input = screen.getByLabelText('Board name')
    await user.clear(input)
    await user.type(input, 'Study Notes')
    await user.click(screen.getByRole('button', { name: 'Rename' }))

    await waitFor(() => expect(noteApi.updateBoard).toHaveBeenCalledWith('board-1', { name: 'Study Notes' }))
    const renamedBoard = await screen.findByRole('button', { name: /Study Notes/ })
    await waitFor(() => expect(renamedBoard).toHaveFocus())
    fireEvent.contextMenu(renamedBoard)
    await user.click(await screen.findByRole('menuitem', { name: 'Delete Board' }))

    await waitFor(() => expect(noteApi.deleteBoard).toHaveBeenCalledWith('board-1'))
    expect(await screen.findByText('No note boards yet')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByTestId('notes-rail-scroll')).toHaveFocus())
  })

  it('renames and deletes a Page from its right-click menu', async () => {
    const user = userEvent.setup()
    const boardAfterDelete: noteApi.NoteBoardSummary = {
      id: 'board-1',
      name: 'Learning Notes',
      createdAt: '2026-07-09T09:00:00Z',
      updatedAt: '2026-07-09T09:00:00Z',
      pages: [],
    }
    vi.mocked(noteApi.listBoards).mockResolvedValueOnce([{
      ...boardAfterDelete,
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
    }]).mockResolvedValue([boardAfterDelete])
    vi.mocked(noteApi.getPage).mockResolvedValue({
      id: 'page-1', boardId: 'board-1', name: 'Week 1 reflections', content: '', date: '2026-07-09',
      createdAt: '2026-07-09T09:00:00Z', updatedAt: '2026-07-09T09:00:00Z',
    })
    vi.mocked(noteApi.updatePage).mockResolvedValue({
      id: 'page-1', boardId: 'board-1', name: 'Weekly review', content: '', date: '2026-07-09',
      createdAt: '2026-07-09T09:00:00Z', updatedAt: '2026-07-09T10:00:00Z',
    })

    renderPage()

    fireEvent.contextMenu(await screen.findByRole('button', { name: 'Week 1 reflections' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Rename Page' }))
    const input = screen.getByLabelText('Page name')
    await user.clear(input)
    await user.type(input, 'Weekly review')
    await user.click(screen.getByRole('button', { name: 'Rename' }))

    await waitFor(() => expect(noteApi.updatePage).toHaveBeenCalledWith('page-1', { name: 'Weekly review' }))
    const renamedPage = await screen.findByRole('button', { name: 'Weekly review' })
    await waitFor(() => expect(renamedPage).toHaveFocus())
    fireEvent.contextMenu(renamedPage)
    await user.click(await screen.findByRole('menuitem', { name: 'Delete Page' }))

    await waitFor(() => expect(noteApi.deletePage).toHaveBeenCalledWith('page-1'))
    expect(await screen.findByText('This board has no pages')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByTestId('notes-rail-scroll')).toHaveFocus())
  })
})
