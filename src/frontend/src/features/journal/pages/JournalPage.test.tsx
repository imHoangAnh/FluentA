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
    getJournalVocabSuggestions: vi.fn(),
    getJournalEntry: vi.fn(),
    createJournalEntry: vi.fn(),
    updateJournalEntry: vi.fn(),
    deleteJournalEntry: vi.fn(),
  }
})

function localTodayStr() {
  const now = new Date()
  return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}-${`${now.getDate()}`.padStart(2, '0')}`
}

function makeTodayEntry(overrides: Partial<journalApi.JournalEntry> = {}): journalApi.JournalEntry {
  const today = localTodayStr()
  return {
    id: 'journal-today',
    title: 'Today focus reflection',
    content: '<p>Reviewed resilient vocabulary and practiced speaking.</p>',
    date: today,
    createdAt: `${today}T08:00:00Z`,
    updatedAt: `${today}T09:00:00Z`,
    mood: 'peaceful',
    isStarred: false,
    tags: ['reflection', 'english'],
    ...overrides,
  }
}

const pastEntry: journalApi.JournalEntry = {
  id: 'journal-past',
  title: 'Rainy past thoughts',
  content: '<p>Looked back at resilient moments from last month.</p>',
  date: '2026-07-22',
  createdAt: '2026-07-22T08:00:00Z',
  updatedAt: '2026-07-22T09:00:00Z',
  mood: 'reflective',
  isStarred: false,
  tags: ['evening'],
}

function toSummary(entry: journalApi.JournalEntry): journalApi.JournalEntrySummary {
  return {
    id: entry.id,
    title: entry.title,
    date: entry.date,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    mood: entry.mood,
    isStarred: entry.isStarred,
    tags: entry.tags,
    preview: entry.content.replace(/<[^>]*>/g, ' ').trim(),
  }
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

describe('JournalPage auto-today and view-only history', () => {
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
    const todayEntry = makeTodayEntry()
    vi.mocked(journalApi.listJournalEntries).mockResolvedValue([toSummary(todayEntry), toSummary(pastEntry)])
    vi.mocked(journalApi.searchJournalEntries).mockResolvedValue([])
    vi.mocked(journalApi.getJournalCalendar).mockResolvedValue([
      { date: todayEntry.date, count: 1, mood: 'peaceful' },
      { date: pastEntry.date, count: 1, mood: 'reflective' },
    ])
    vi.mocked(journalApi.getJournalVocabSuggestions).mockResolvedValue([
      { id: 'vocab-1', word: 'resilient', meaning: 'able to recover', type: 'Adjective' },
      { id: 'vocab-2', word: 'serendipity', meaning: 'happy accident', type: 'Noun' },
    ])
    vi.mocked(journalApi.getJournalEntry).mockImplementation(async (id) =>
      id === pastEntry.id ? pastEntry : makeTodayEntry(),
    )
    vi.mocked(journalApi.updateJournalEntry).mockImplementation(async (id, input) => {
      const base = id === pastEntry.id ? pastEntry : makeTodayEntry()
      return {
        ...base,
        title: input.title ?? base.title,
        content: input.content ?? base.content,
        mood: input.mood === '' ? null : ((input.mood as journalApi.JournalMoodId | undefined) ?? base.mood),
        isStarred: input.isStarred ?? base.isStarred,
        tags: input.tags ?? base.tags,
      }
    })
    vi.mocked(journalApi.deleteJournalEntry).mockResolvedValue({ deleted: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('auto-opens Today entry in editable mode with 3-pane layout, Daily Quote, Random Vocab, and Format toolbar', async () => {
    const user = userEvent.setup()
    const todayEntry = makeTodayEntry()
    renderPage()

    const titleInput = await screen.findByLabelText('Journal title')
    await waitFor(() => expect(titleInput).toHaveValue(todayEntry.title))
    expect(titleInput).toBeEnabled()
    expect(document.querySelector('.journal-utility-bar')).not.toBeInTheDocument()

    const sidebar = screen.getByTestId('journal-workspace').querySelector('.journal-sidebar')
    expect(sidebar).toContainElement(screen.getByTestId('journal-search-input'))
    expect(screen.getByText(/day streak/i)).toBeInTheDocument()
    expect(screen.getByText('All 2')).toBeInTheDocument()

    // Daily quote & author + cycle action
    const quoteText = await screen.findByTestId('journal-daily-quote-text')
    const initialQuote = quoteText.textContent
    expect(screen.getByTestId('journal-daily-quote-author').textContent?.length).toBeGreaterThan(0)
    await user.click(screen.getByRole('button', { name: 'Next daily quote' }))
    expect(screen.getByTestId('journal-daily-quote-text').textContent).not.toBe(initialQuote)

    // Vocab chip auto-checks off words present in active Today entry
    const vocabChips = await screen.findByTestId('journal-vocab-chips')
    expect(within(vocabChips).getByRole('button', { name: 'resilient' })).toHaveAttribute('data-used', 'true')
    expect(within(vocabChips).getByRole('button', { name: 'serendipity' })).toHaveAttribute('data-used', 'false')

    // Format dock toggles formatting toolbar
    expect(screen.queryByRole('toolbar', { name: 'Journal formatting tools' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Format' }))
    expect(await screen.findByRole('toolbar', { name: 'Journal formatting tools' }, { timeout: 5_000 })).toBeInTheDocument()
  })

  it('auto-opens a fresh editable sheet for Today when none exists and autosaves without a create button', async () => {
    vi.mocked(journalApi.listJournalEntries).mockResolvedValue([toSummary(pastEntry)])
    vi.mocked(journalApi.createJournalEntry).mockImplementation(async (input) => ({
      ...makeTodayEntry(),
      id: 'journal-created',
      title: input.title,
      date: input.date,
      content: input.content ?? '',
      mood: input.mood ?? null,
      isStarred: Boolean(input.isStarred),
      tags: input.tags ?? [],
    }))

    renderPage()

    const titleInput = await screen.findByLabelText('Journal title')
    await waitFor(() => expect(titleInput).toBeEnabled())
    expect(titleInput).toHaveValue('')
    expect(screen.queryByRole('button', { name: 'New Journal' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()

    vi.useFakeTimers()
    fireEvent.change(titleInput, { target: { value: 'New daily entry' } })
    fireEvent.click(screen.getByRole('button', { name: 'Grateful' }))
    fireEvent.click(screen.getByRole('button', { name: 'Star entry' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add tag' }))
    const tagInput = screen.getByLabelText('New tag')
    fireEvent.change(tagInput, { target: { value: '#Morning' } })
    fireEvent.keyDown(tagInput, { key: 'Enter' })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000)
    })

    expect(journalApi.createJournalEntry).toHaveBeenCalledWith(expect.objectContaining({
      title: 'New daily entry',
      date: localTodayStr(),
      mood: 'grateful',
      isStarred: true,
      tags: ['morning'],
    }))
  })

  it('opens non-today entries as view-only while keeping Star, Delete, and jumping back to Today working', async () => {
    const user = userEvent.setup()
    const todayEntry = makeTodayEntry()
    renderPage()

    await waitFor(() => expect(screen.getByLabelText('Journal title')).toHaveValue(todayEntry.title))

    await user.click(screen.getByRole('button', { name: `Open journal ${pastEntry.title}` }))

    const titleInput = await screen.findByLabelText('Journal title')
    await waitFor(() => expect(titleInput).toHaveValue(pastEntry.title))
    expect(titleInput).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Reflective' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Add tag' })).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Writing dock' })).not.toBeInTheDocument()

    const editor = await screen.findByRole('textbox', { name: 'Journal rich text editor' })
    await waitFor(() => expect(editor).toHaveAttribute('contenteditable', 'false'))

    // Star remains enabled and updates immediately on read-only entries
    const starBtn = screen.getByRole('button', { name: 'Star entry' })
    expect(starBtn).toBeEnabled()
    await user.click(starBtn)
    expect(journalApi.updateJournalEntry).toHaveBeenCalledWith(pastEntry.id, { isStarred: true })

    // 7-day streak strip returns to Today editable entry
    await user.click(screen.getByRole('button', { name: new RegExp(`Jump to ${localTodayStr()}`) }))
    await waitFor(() => expect(screen.getByLabelText('Journal title')).toHaveValue(todayEntry.title))
    expect(screen.getByLabelText('Journal title')).toBeEnabled()
  })

  it('shows a view-only sheet when selecting an empty past date on Calendar', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-08-08T10:00:00Z'))
    const augToday = makeTodayEntry()
    vi.mocked(journalApi.listJournalEntries).mockResolvedValue([toSummary(augToday), toSummary(pastEntry)])

    renderPage()
    await waitFor(() => expect(screen.getByLabelText('Journal title')).toHaveValue(augToday.title))

    fireEvent.click(screen.getByLabelText('Choose journal date'))
    const headerCalendar = screen.getByLabelText('Journal date calendar')
    const prevMonthButton = await within(headerCalendar).findByRole('button', { name: /previous month/i })
    fireEvent.click(prevMonthButton)

    const emptyDate = '2026-07-15'
    fireEvent.click(within(headerCalendar).getByTestId(`journal-calendar-day-${emptyDate}`))
    await waitFor(() => {
      expect(screen.getByTestId('journal-date-display')).toHaveAttribute('data-date', emptyDate)
    })
    const emptyTitle = screen.getByLabelText('Journal title')
    expect(emptyTitle).toBeDisabled()
    expect(emptyTitle).toHaveValue('')
    expect(emptyTitle).toHaveAttribute('placeholder', 'No entry for this day')
    expect(screen.getByRole('button', { name: 'Peaceful' })).toBeDisabled()
    const editor = await screen.findByRole('textbox', { name: 'Journal rich text editor' })
    await waitFor(() => expect(editor).toHaveAttribute('contenteditable', 'false'))
    expect(screen.queryByRole('group', { name: 'Writing dock' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Star entry' })).not.toBeInTheDocument()

    // Jump back to Today via sidebar entry
    fireEvent.click(screen.getByRole('button', { name: `Open journal ${augToday.title}` }))
    await waitFor(() => expect(screen.getByLabelText('Journal title')).toHaveValue(augToday.title))
  })

  it('warns before leaving an unsaved Today draft and only discards after confirmation', async () => {
    const todayEntry = makeTodayEntry()
    renderPage()
    await waitFor(() => expect(screen.getByLabelText('Journal title')).toHaveValue(todayEntry.title))

    fireEvent.change(screen.getByLabelText('Journal title'), { target: { value: 'Unsaved Today draft' } })
    fireEvent.click(screen.getByRole('button', { name: `Open journal ${pastEntry.title}` }))
    expect(screen.getByRole('alertdialog')).toHaveTextContent('may be lost')

    fireEvent.click(screen.getByRole('button', { name: 'Stay' }))
    expect(screen.getByLabelText('Journal title')).toHaveValue('Unsaved Today draft')

    fireEvent.click(screen.getByRole('button', { name: `Open journal ${pastEntry.title}` }))
    fireEvent.click(screen.getByRole('button', { name: 'Discard and continue' }))
    await waitFor(() => expect(screen.getByLabelText('Journal title')).toHaveValue(pastEntry.title))
    expect(journalApi.updateJournalEntry).not.toHaveBeenCalled()
  })

  it('keeps editing disabled when opening another entry fails instead of saving previous content into it', async () => {
    const todayEntry = makeTodayEntry()
    vi.mocked(journalApi.getJournalEntry).mockImplementation(async (id) => {
      if (id === pastEntry.id) throw new Error('Network failed')
      return todayEntry
    })
    renderPage()
    await waitFor(() => expect(screen.getByLabelText('Journal title')).toHaveValue(todayEntry.title))

    fireEvent.click(screen.getByRole('button', { name: `Open journal ${pastEntry.title}` }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not open journal.')
    expect(screen.getByLabelText('Journal title')).toBeDisabled()
    const editor = await screen.findByRole('textbox', { name: 'Journal rich text editor' })
    await waitFor(() => expect(editor).toHaveAttribute('contenteditable', 'false'))
    expect(editor).not.toHaveTextContent('Reviewed resilient vocabulary')
    expect(journalApi.updateJournalEntry).not.toHaveBeenCalled()
  })

  it('confirms deletion, supports cancellation and keeps a failed delete available for retry', async () => {
    const user = userEvent.setup()
    const todayEntry = makeTodayEntry()
    vi.mocked(journalApi.deleteJournalEntry).mockRejectedValueOnce(new Error('Network failed')).mockResolvedValue({ deleted: true })
    renderPage()
    await waitFor(() => expect(screen.getByLabelText('Journal title')).toHaveValue(todayEntry.title))

    await user.click(screen.getByRole('button', { name: `Delete journal ${todayEntry.title}` }))
    expect(journalApi.deleteJournalEntry).not.toHaveBeenCalled()
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancel' }))
    expect(journalApi.deleteJournalEntry).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: `Delete journal ${todayEntry.title}` }))
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' }))
    expect(await within(screen.getByRole('alertdialog')).findByRole('alert')).toHaveTextContent('Could not delete')

    vi.mocked(journalApi.listJournalEntries).mockResolvedValue([toSummary(pastEntry)])
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(journalApi.deleteJournalEntry).toHaveBeenCalledTimes(2)
    expect(journalApi.deleteJournalEntry).toHaveBeenCalledWith(todayEntry.id)
    // After deleting Today's entry, resets to a fresh editable Today sheet
    expect(screen.getByLabelText('Journal title')).toHaveValue('')
    expect(screen.getByLabelText('Journal title')).toBeEnabled()
  })
})
