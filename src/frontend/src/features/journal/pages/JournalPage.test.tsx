import '@/test/rich-text-dom'
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
        fullName: 'FluentA Learner',
        avatarUrl: null,
      },
    })
    vi.mocked(journalApi.listJournalEntries).mockResolvedValue([journalEntry])
    vi.mocked(journalApi.searchJournalEntries).mockResolvedValue([])
    vi.mocked(journalApi.getJournalCalendar).mockResolvedValue([{ date: journalEntry.date, count: 1 }])
    vi.mocked(journalApi.getJournalEntry).mockResolvedValue(journalEntry)
    vi.mocked(journalApi.updateJournalEntry).mockResolvedValue(journalEntry)
    vi.mocked(journalApi.deleteJournalEntry).mockResolvedValue({ deleted: true })
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
    expect(within(actions).queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
    const deleteButton = within(actions).getByRole('button', { name: `Delete journal ${journalEntry.title}` })

    expect(titleInput).toHaveValue(journalEntry.title)
    expect(dateDisplay).toHaveAttribute('data-date', journalEntry.date)
    expect(within(editorHeader).queryByLabelText('Journal date')).not.toBeInTheDocument()
    expect(deleteButton).toBeInTheDocument()
    expect(within(actions).getByTestId('journal-save-status')).toHaveTextContent('Saved')

    const editorBody = screen.getByTestId('journal-editor-body')
    const toolbar = await screen.findByRole('toolbar', { name: 'Journal formatting tools' }, { timeout: 5_000 })
    const writingSurface = within(editorBody).getByLabelText('Journal rich text editor')
    expect(editorHeader.compareDocumentPosition(toolbar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(toolbar.compareDocumentPosition(writingSurface) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(document.querySelector('.journal-editor-footer')).not.toBeInTheDocument()
  })

  it('auto-saves a new entry without a Save button and keeps its date read-only', async () => {
    vi.mocked(journalApi.createJournalEntry).mockImplementation(async input => ({ ...journalEntry, title: input.title, date: input.date, content: input.content ?? '' }))
    renderPage()
    const create = await screen.findByTestId('create-journal-button')
    await waitFor(() => expect(create).toBeEnabled())
    fireEvent.click(create)
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
    vi.useFakeTimers()
    fireEvent.change(screen.getByLabelText('Journal title'), { target: { value: 'New daily entry' } })
    await act(async () => { await vi.advanceTimersByTimeAsync(2_000) })
    expect(journalApi.createJournalEntry).toHaveBeenCalledWith(expect.objectContaining({ title: 'New daily entry', date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) }))
    expect(screen.getByTestId('journal-save-status')).toHaveTextContent('Saved')
    expect(screen.queryByTestId('journal-date-input')).not.toBeInTheDocument()
  })

  it('warns before leaving an unsaved draft and only discards after confirmation', async () => {
    const second = { ...journalEntry, id: 'journal-2', title: 'Another day', date: '2026-07-23' }
    vi.mocked(journalApi.listJournalEntries).mockResolvedValue([journalEntry, second])
    vi.mocked(journalApi.getJournalEntry).mockImplementation(async id => id === second.id ? second : journalEntry)
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: `Open journal ${journalEntry.title}` }))
    await waitFor(() => expect(screen.getByLabelText('Journal title')).toHaveValue(journalEntry.title))
    fireEvent.change(screen.getByLabelText('Journal title'), { target: { value: 'Unsaved draft' } })
    fireEvent.click(screen.getByRole('button', { name: 'Open journal Another day' }))
    expect(screen.getByRole('alertdialog')).toHaveTextContent('may be lost')
    fireEvent.click(screen.getByRole('button', { name: 'Stay' }))
    expect(screen.getByLabelText('Journal title')).toHaveValue('Unsaved draft')
    fireEvent.click(screen.getByRole('button', { name: 'Open journal Another day' }))
    fireEvent.click(screen.getByRole('button', { name: 'Discard and continue' }))
    await waitFor(() => expect(screen.getByLabelText('Journal title')).toHaveValue(second.title))
    expect(journalApi.updateJournalEntry).not.toHaveBeenCalled()
  })

  it('renders the Figma first-entry state with a New Journal action', async () => {
    vi.mocked(journalApi.listJournalEntries).mockResolvedValueOnce([])

    renderPage()

    expect(await screen.findByRole('heading', { name: 'Your story starts here' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('How do you feel today?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start wherever you are…' })).toBeInTheDocument()

    const newJournalButton = screen.getByRole('button', { name: 'New Journal' })
    await userEvent.click(newJournalButton)

    expect(screen.getByLabelText('Journal title')).toHaveValue('New Journal')
  })

  it('filters the current in-memory draft without discarding it and removes it after autosave', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: `Open journal ${journalEntry.title}` }))
    await waitFor(() => expect(screen.getByLabelText('Journal title')).toHaveValue(journalEntry.title))
    vi.useFakeTimers()
    fireEvent.change(screen.getByLabelText('Journal title'), { target: { value: 'Current unsaved entry' } })
    fireEvent.click(screen.getByRole('button', { name: 'Drafts' }))
    expect(screen.getByRole('button', { name: 'Open current draft Current unsaved entry' })).toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: `Open journal ${journalEntry.title}` })).not.toBeInTheDocument()
    await act(async () => { await vi.advanceTimersByTimeAsync(2_000) })
    expect(screen.queryByRole('button', { name: 'Open current draft Current unsaved entry' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'No unsaved drafts' })).toBeInTheDocument()
  })

  it('keeps editing disabled when opening another entry fails instead of saving the previous content into it', async () => {
    const second = { ...journalEntry, id: 'journal-2', title: 'Unavailable entry', date: '2026-07-23' }
    vi.mocked(journalApi.listJournalEntries).mockResolvedValue([journalEntry, second])
    vi.mocked(journalApi.getJournalEntry).mockImplementation(async id => {
      if (id === second.id) throw new Error('Network failed')
      return journalEntry
    })
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: `Open journal ${journalEntry.title}` }))
    await waitFor(() => expect(screen.getByLabelText('Journal title')).toHaveValue(journalEntry.title))

    fireEvent.click(screen.getByRole('button', { name: `Open journal ${second.title}` }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not open journal.')
    expect(screen.getByLabelText('Journal title')).toBeDisabled()
    const editor = await screen.findByRole('textbox', { name: 'Journal rich text editor' })
    await waitFor(() => expect(editor).toHaveAttribute('contenteditable', 'false'))
    expect(editor).not.toHaveTextContent('Reviewed vocabulary')
    expect(journalApi.updateJournalEntry).not.toHaveBeenCalled()
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

  it('confirms deletion, supports cancellation and keeps a failed delete available for retry', async () => {
    const user = userEvent.setup()
    vi.mocked(journalApi.deleteJournalEntry).mockRejectedValueOnce(new Error('Network failed')).mockResolvedValue({ deleted: true })
    renderPage()
    await user.click(await screen.findByRole('button', { name: `Open journal ${journalEntry.title}` }))
    await waitFor(() => expect(screen.getByLabelText('Journal title')).toHaveValue(journalEntry.title))
    await user.click(screen.getByRole('button', { name: `Delete journal ${journalEntry.title}` }))
    expect(journalApi.deleteJournalEntry).not.toHaveBeenCalled()
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancel' }))
    expect(journalApi.deleteJournalEntry).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: `Delete journal ${journalEntry.title}` }))
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' }))
    expect(await within(screen.getByRole('alertdialog')).findByRole('alert')).toHaveTextContent('Could not delete')
    vi.mocked(journalApi.listJournalEntries).mockResolvedValue([])
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(journalApi.deleteJournalEntry).toHaveBeenCalledTimes(2)
    expect(journalApi.deleteJournalEntry).toHaveBeenCalledWith(journalEntry.id)
    expect(screen.queryByRole('button', { name: `Open journal ${journalEntry.title}` })).not.toBeInTheDocument()
  })

  it('interacts with the shadcn UI calendar to open populated and prepare empty dates', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-08-08T10:00:00Z'))
    renderPage()

    fireEvent.click(screen.getByLabelText('Choose journal date'))
    const prevMonthButton = await screen.findByRole('button', { name: /previous month/i })
    fireEvent.click(prevMonthButton)

    await waitFor(async () => {
      const populatedButton = screen.getByTestId(`journal-calendar-day-${journalEntry.date}`)
      expect(populatedButton).toHaveAccessibleName(`${journalEntry.date}, 1 journal entry`)
      expect(within(populatedButton).getByText('1')).toBeInTheDocument()
    })

    const populatedButton = screen.getByTestId(`journal-calendar-day-${journalEntry.date}`)
    fireEvent.click(populatedButton)
    await waitFor(() => {
      expect(screen.getByTestId('journal-title-input')).toHaveValue(journalEntry.title)
    })

    const emptyDate = '2026-07-15'
    fireEvent.click(screen.getByLabelText('Choose journal date'))
    const emptyButton = screen.getByTestId(`journal-calendar-day-${emptyDate}`)
    fireEvent.click(emptyButton)
    await waitFor(() => {
      expect(screen.getByTestId('journal-editor-empty-state')).toBeInTheDocument()
      expect(screen.getByTestId('journal-date-display')).toHaveAttribute('data-date', emptyDate)
    })

    const createButton = screen.getByTestId('create-journal-button')
    fireEvent.click(createButton)
    await waitFor(() => {
      expect(screen.queryByTestId('journal-editor-empty-state')).not.toBeInTheDocument()
      expect(screen.getByTestId('journal-title-input')).toHaveValue('New Journal')
      expect(screen.getByTestId('journal-date-display')).toHaveAttribute('data-date', emptyDate)
    })
  })
})
