import { QueryClient } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders } from '@/app/providers'
import { useAuthStore } from '@/features/auth'
import * as journalApi from '../api/journal.api'
import { JournalPage } from './JournalPage'

vi.mock('../api/journal.api', async () => {
  const actual = await vi.importActual<typeof import('../api/journal.api')>('../api/journal.api')
  return {
    ...actual,
    listJournalEntries: vi.fn(),
    searchJournalEntries: vi.fn(),
    getJournalCalendar: vi.fn(),
    getJournalEntry: vi.fn(),
    createJournalEntry: vi.fn(),
    updateJournalEntry: vi.fn(),
    deleteJournalEntry: vi.fn(),
  }
})

const journalEntry: journalApi.JournalEntry = {
  id: 'journal-1',
  title: 'A focused study day',
  content: '<p>Reviewed vocabulary and practiced speaking.</p>',
  date: '2026-07-22',
  createdAt: '2026-07-22T08:00:00Z',
  updatedAt: '2026-07-22T09:00:00Z',
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return render(
    <AppProviders queryClient={queryClient}>
      <MemoryRouter initialEntries={['/journal']}>
        <JournalPage />
      </MemoryRouter>
    </AppProviders>,
  )
}

describe('JournalPage workspace redesign', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({
      status: 'authenticated',
      user: {
        id: 'user-1',
        email: 'learner@example.com',
        fullName: 'FluentA Learner',
        isEmailVerified: true,
      },
    })
    vi.mocked(journalApi.listJournalEntries).mockResolvedValue([journalEntry])
    vi.mocked(journalApi.searchJournalEntries).mockResolvedValue([])
    vi.mocked(journalApi.getJournalCalendar).mockResolvedValue([{ date: journalEntry.date, count: 1 }])
    vi.mocked(journalApi.getJournalEntry).mockResolvedValue(journalEntry)
    vi.mocked(journalApi.updateJournalEntry).mockResolvedValue(journalEntry)
    vi.mocked(journalApi.deleteJournalEntry).mockResolvedValue({
      id: 'trash-1', entityKind: 'Journal', entityId: journalEntry.id, displayName: journalEntry.title, originalLocation: journalEntry.date, trashedAt: '2026-07-28T00:00:00Z', purgeAfterAt: '2026-08-27T00:00:00Z',
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the approved full-width hierarchy for a persisted entry', async () => {
    const user = userEvent.setup()
    renderPage()

    const search = await screen.findByTestId('journal-search-input')
    const workspace = screen.getByTestId('journal-workspace')
    const sidebar = workspace.querySelector('.journal-sidebar')
    expect(screen.queryByText('My Journal')).not.toBeInTheDocument()
    expect(sidebar).toContainElement(search)

    const entryButton = await screen.findByRole('button', { name: `Open journal ${journalEntry.title}` })
    expect(entryButton).toHaveTextContent(journalEntry.title)
    expect(within(entryButton).getByTestId('journal-entry-date')).toBeInTheDocument()
    expect(within(entryButton).getAllByText(journalEntry.title)).toHaveLength(1)

    await user.click(entryButton)

    const editorHeader = await screen.findByTestId('journal-editor-header')
    const titleInput = within(editorHeader).getByLabelText('Journal title')
    const dateDisplay = within(editorHeader).getByTestId('journal-date-display')
    const actions = within(editorHeader).getByTestId('journal-editor-actions')
    const saveButton = within(actions).getByTestId('save-journal-button')
    const deleteButton = within(actions).getByRole('button', { name: `Delete journal ${journalEntry.title}` })

    expect(titleInput).toHaveValue(journalEntry.title)
    expect(dateDisplay).toHaveAttribute('data-date', journalEntry.date)
    expect(within(editorHeader).queryByLabelText('Journal date')).not.toBeInTheDocument()
    expect(saveButton.compareDocumentPosition(deleteButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(within(actions).getByTestId('journal-save-status')).toHaveTextContent('Saved')

    const editorBody = screen.getByTestId('journal-editor-body')
    const toolbar = await within(editorHeader).findByRole('toolbar', { name: 'Journal formatting tools' })
    const writingSurface = within(editorBody).getByLabelText('Journal rich text editor')
    expect(editorHeader.compareDocumentPosition(toolbar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(toolbar.compareDocumentPosition(writingSurface) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(document.querySelector('.journal-editor-footer')).not.toBeInTheDocument()
  })

  it('uses Save for a new entry while keeping the date read-only', async () => {
    renderPage()

    const saveButton = await screen.findByTestId('save-journal-button')
    expect(saveButton).toHaveTextContent('Save')
    expect(saveButton).not.toHaveTextContent('Create')
    expect(screen.getByTestId('journal-date-display')).toHaveAttribute('data-date', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/))
    expect(screen.queryByTestId('journal-date-input')).not.toBeInTheDocument()
  })

  it('renders the recent journals empty state with a New Journal action', async () => {
    vi.mocked(journalApi.listJournalEntries).mockResolvedValueOnce([])

    renderPage()

    expect(await screen.findByRole('heading', { name: 'No journals yet' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Recent journals' })).toBeInTheDocument()

    const newJournalButton = screen.getByRole('button', { name: 'New Journal' })
    await userEvent.click(newJournalButton)

    expect(screen.getByLabelText('Journal title')).toHaveValue('New Journal')
  })

  it('keeps the two-second autosave behavior for persisted entries', async () => {
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: `Open journal ${journalEntry.title}` }))
    const titleInput = await screen.findByLabelText('Journal title')
    await waitFor(() => expect(titleInput).toHaveValue(journalEntry.title))

    vi.useFakeTimers()
    fireEvent.change(titleInput, { target: { value: 'A focused study day, updated' } })
    expect(screen.getByTestId('journal-save-status')).toHaveTextContent('Unsaved changes')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000)
    })

    expect(journalApi.updateJournalEntry).toHaveBeenCalledWith(journalEntry.id, {
      title: 'A focused study day, updated',
      content: journalEntry.content,
      date: journalEntry.date,
    })
  })
})
