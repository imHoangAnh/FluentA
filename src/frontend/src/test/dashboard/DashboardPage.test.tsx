import { QueryClient } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders } from '@/app/providers'
import { useAuthStore } from '@/features/auth'
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage'

const adapters = vi.hoisted(() => ({
  listByDate: vi.fn(),
  updateTodo: vi.fn(),
  listHabits: vi.fn(),
  toggleHabitEntry: vi.fn(),
  listCountdowns: vi.fn(),
  getReviewDashboard: vi.fn(),
  listBoards: vi.fn(),
  listJournalEntries: vi.fn(),
  listNoteBoards: vi.fn(),
  getLearningAnalytics: vi.fn(),
}))

vi.mock('@/features/todo', () => ({
  listByDate: adapters.listByDate,
  updateTodo: adapters.updateTodo,
  todoKeys: { all: ['todo'], day: (date: string) => ['todo', 'items', date] },
}))
vi.mock('@/features/habits', () => ({
  listHabits: adapters.listHabits,
  toggleHabitEntry: adapters.toggleHabitEntry,
  habitKeys: { all: ['habit'], list: () => ['habit', 'list'] },
}))
vi.mock('@/features/countdown', () => ({
  listCountdowns: adapters.listCountdowns,
  countdownKeys: { events: ['countdown', 'events'] },
}))
vi.mock('@/features/review', () => ({
  getReviewDashboard: adapters.getReviewDashboard,
  reviewKeys: { dashboard: ['review', 'dashboard'] },
}))
vi.mock('@/features/project', () => ({
  listBoards: adapters.listBoards,
  projectKeys: { boards: ['project', 'boards'] },
}))
vi.mock('@/features/journal', async () => {
  const actual = await vi.importActual<typeof import('@/features/journal')>('@/features/journal')
  return {
    ...actual,
    listJournalEntries: adapters.listJournalEntries,
    journalKeys: { entries: ['journal', 'entries'] },
  }
})
vi.mock('@/features/notes', () => ({
  listNoteBoards: adapters.listNoteBoards,
  noteKeys: { boards: ['note', 'boards'] },
}))
vi.mock('@/features/analytics', () => ({
  getLearningAnalytics: adapters.getLearningAnalytics,
  analyticsKeys: { all: ['analytics'], overview: (range: string) => ['analytics', 'overview', range] },
}))

function renderDashboard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return {
    ...render(
      <AppProviders queryClient={queryClient}>
        <MemoryRouter><DashboardPage /></MemoryRouter>
      </AppProviders>,
    ),
    queryClient,
  }
}

function todo(overrides = {}) {
  return {
    id: 'todo-1',
    title: 'Plan speaking practice',
    note: null,
    date: '2026-07-14',
    isCompleted: false,
    completedAt: null,
    createdAt: '2026-07-14T01:00:00Z',
    updatedAt: '2026-07-14T01:00:00Z',
    ...overrides,
  }
}

function habit(overrides = {}) {
  return {
    id: 'habit-1',
    name: 'Read English',
    description: null,
    color: null,
    icon: 'Book',
    frequency: 'Daily',
    customDays: [],
    currentStreak: 4,
    isScheduledToday: true,
    isCheckedToday: false,
    monthlyCompletionRate: 20,
    createdAt: '2026-07-14T01:00:00Z',
    updatedAt: '2026-07-14T01:00:00Z',
    ...overrides,
  }
}

function analytics(overrides = {}) {
  return {
    range: '30d',
    localDate: '2026-07-14',
    retention: {
      ratePercent: null,
      deltaPercent: null,
      totalReviews: 0,
      correctReviews: 0,
      priorPeriodDays: null,
    },
    mastery: {
      masteredCount: 0,
      totalWords: 0,
      masteredPercent: 0,
      levels: [],
    },
    streak: {
      currentDays: 0,
      longestDays: 0,
    },
    forecast: {
      totalDueNext7Days: 0,
      averagePerDay: 0,
      buckets: [],
    },
    consistencyDays: [],
    weakPhonemes: [],
    ...overrides,
  }
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-07-14T16:30:00Z'))
    useAuthStore.setState({
      status: 'authenticated',
      error: null,
      user: { id: 'user-1', fullName: 'Vanh Nguyen', avatarUrl: null },
    })
    adapters.listByDate.mockResolvedValue([])
    adapters.listHabits.mockResolvedValue([])
    adapters.listCountdowns.mockResolvedValue([])
    adapters.getReviewDashboard.mockResolvedValue({ localDate: '2026-07-14', dueCount: 0, previewWords: [] })
    adapters.listBoards.mockResolvedValue([])
    adapters.listJournalEntries.mockResolvedValue([])
    adapters.listNoteBoards.mockResolvedValue([])
    adapters.getLearningAnalytics.mockResolvedValue(analytics())
    adapters.updateTodo.mockResolvedValue(todo({ isCompleted: true }))
    adapters.toggleHabitEntry.mockResolvedValue(habit({ isCheckedToday: true }))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders current empty states, links, and UTC date queries', async () => {
    renderDashboard()

    expect(await screen.findByText('No reviews due today.')).toBeInTheDocument()
    expect(screen.getByText('No tasks for today.')).toBeInTheDocument()
    expect(screen.getByText('No habits scheduled today.')).toBeInTheDocument()
    expect(screen.getByText('No upcoming events')).toBeInTheDocument()
    expect(screen.getByText('No project boards yet.')).toBeInTheDocument()
    expect(screen.getByText('No notes yet.')).toBeInTheDocument()

    expect(screen.getByRole('heading', { name: 'Good afternoon, Vanh' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open Review' })).toBeEnabled()
    expect(screen.getByRole('link', { name: 'View all tasks' })).toHaveAttribute('href', '/todo')
    expect(screen.getByRole('link', { name: 'Open Countdowns' })).toHaveAttribute('href', '/countdowns')
    expect(screen.getByRole('link', { name: 'Open Habits' })).toHaveAttribute('href', '/habits')
    expect(screen.getByRole('link', { name: 'All Projects' })).toHaveAttribute('href', '/project')
    expect(screen.getByRole('link', { name: 'Journal' })).toHaveAttribute('href', '/journal')
    expect(screen.getByRole('link', { name: 'All Notes' })).toHaveAttribute('href', '/notes')
    expect(screen.getByRole('link', { name: 'View Analytics' })).toHaveAttribute('href', '/analytics')

    expect(adapters.listByDate).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/))
    expect(adapters.listHabits).toHaveBeenCalledWith()
    expect(adapters.getReviewDashboard).toHaveBeenCalledWith()
    expect(adapters.listBoards).toHaveBeenCalledWith()
    expect(adapters.listJournalEntries).toHaveBeenCalledWith()
    expect(adapters.listNoteBoards).toHaveBeenCalledWith()
    expect(adapters.getLearningAnalytics).toHaveBeenCalledWith('30d')
  })

  it('renders populated cross-domain widgets matching Home layout', async () => {
    adapters.getReviewDashboard.mockResolvedValue({
      localDate: '2026-07-14',
      dueCount: 5,
      previewWords: [
        { wordId: 'w-1', word: 'mitigate', ipaPronunciation: "/'mit.i.geit/" },
        { wordId: 'w-2', word: 'nuance', ipaPronunciation: "/'nju:.a:ns/" },
        { wordId: 'w-3', word: 'redundant', ipaPronunciation: '/ri.dan.dent/' },
      ],
    })
    adapters.listByDate.mockResolvedValue([
      todo({ id: 't-1', title: 'Finalize IELTS Task 2 essay outline', isCompleted: false, createdAt: '2026-07-14T01:00:00Z' }),
      todo({ id: 't-2', title: 'Review 5 scheduled vocabulary cards', isCompleted: false, createdAt: '2026-07-14T02:00:00Z' }),
      todo({ id: 't-3', title: 'Polish FluentA top-bar navigation', isCompleted: true, completedAt: '2026-07-14T03:00:00Z' }),
    ])
    adapters.listCountdowns.mockResolvedValue([
      {
        id: 'countdown-completed',
        name: 'Old memory',
        targetDate: '2025-12-20',
        isCompleted: true,
        alerts: [],
        createdAt: '2025-07-14T01:00:00Z',
        updatedAt: '2025-07-14T01:00:00Z',
      },
      {
        id: 'countdown-1',
        name: 'IELTS Academic Exam',
        targetDate: '2026-12-22',
        isCompleted: false,
        alerts: [],
        createdAt: '2026-07-14T01:00:00Z',
        updatedAt: '2026-07-14T01:00:00Z',
      },
    ])
    adapters.listHabits.mockResolvedValue([
      habit({ id: 'h-0', name: 'Ignored Offday', isScheduledToday: false, isCheckedToday: true }),
      habit({ id: 'h-1', name: 'Practice 15 IELTS Words', isCheckedToday: true, currentStreak: 14 }),
      habit({ id: 'h-2', name: 'Read 20 Pages', isCheckedToday: true, currentStreak: 19 }),
      habit({ id: 'h-3', name: 'Evening Review 10m', isCheckedToday: false, currentStreak: 7 }),
    ])
    adapters.listBoards.mockResolvedValue([
      { id: 'b-1', name: 'FluentA v2.1 Roadmap', cardCount: 11 },
      { id: 'b-2', name: 'IELTS Band 8.0 Prep', cardCount: 5 },
      { id: 'b-3', name: 'Archive Board', cardCount: 2 },
    ])
    adapters.listJournalEntries.mockResolvedValue([
      { id: 'j-1', title: 'Today reflection', date: '2026-07-14', createdAt: '2026-07-14T10:00:00Z', updatedAt: '2026-07-14T10:00:00Z' },
      { id: 'j-2', title: 'Yesterday note', date: '2026-07-13', createdAt: '2026-07-13T10:00:00Z', updatedAt: '2026-07-13T10:00:00Z' },
    ])
    adapters.listNoteBoards.mockResolvedValue([
      {
        id: 'nb-1',
        name: 'Study Notes',
        createdAt: '2026-07-01T00:00:00Z',
        updatedAt: '2026-07-14T14:30:00Z',
        pages: [
          {
            id: 'np-1',
            boardId: 'nb-1',
            name: 'IELTS Band 8 Cohesion Connectors',
            date: '2026-07-14',
            createdAt: '2026-07-14T14:00:00Z',
            updatedAt: '2026-07-14T14:30:00Z',
          },
          {
            id: 'np-2',
            boardId: 'nb-1',
            name: 'FluentA Architecture Overview',
            date: '2026-07-10',
            createdAt: '2026-07-10T10:00:00Z',
            updatedAt: '2026-07-10T10:00:00Z',
          },
          {
            id: 'np-3',
            boardId: 'nb-1',
            name: 'Older draft',
            date: '2026-07-01',
            createdAt: '2026-07-01T10:00:00Z',
            updatedAt: '2026-07-01T10:00:00Z',
          },
        ],
      },
    ])
    adapters.getLearningAnalytics.mockResolvedValue(analytics({
      retention: {
        ratePercent: 86.4,
        deltaPercent: 2.1,
        totalReviews: 125,
        correctReviews: 108,
        priorPeriodDays: 30,
      },
      mastery: {
        masteredCount: 142,
        totalWords: 248,
        masteredPercent: 57.3,
        levels: [],
      },
      streak: {
        currentDays: 14,
        longestDays: 19,
      },
      consistencyDays: [
        { date: '2026-07-08', activityCount: 4, intensityLevel: 1 },
        { date: '2026-07-09', activityCount: 8, intensityLevel: 2 },
        { date: '2026-07-10', activityCount: 6, intensityLevel: 1 },
        { date: '2026-07-11', activityCount: 14, intensityLevel: 3 },
        { date: '2026-07-12', activityCount: 10, intensityLevel: 2 },
        { date: '2026-07-13', activityCount: 16, intensityLevel: 3 },
        { date: '2026-07-14', activityCount: 12, intensityLevel: 2 },
      ],
    }))

    renderDashboard()

    const reviewWidget = within(screen.getByTestId('dashboard-widget-review'))
    expect(within(await reviewWidget.findByTestId('dashboard-review-due-ring')).getByText('5')).toBeInTheDocument()
    expect(reviewWidget.getByTestId('dashboard-review-due-badge')).toHaveTextContent('5 words ready')
    expect(await reviewWidget.findByTestId('dashboard-review-retention-badge')).toHaveTextContent('86.4% retention')
    expect(reviewWidget.getByText('mitigate')).toBeInTheDocument()
    expect(reviewWidget.getByText("/'mit.i.geit/")).toBeInTheDocument()
    expect(reviewWidget.getByText('nuance')).toBeInTheDocument()
    expect(reviewWidget.queryByText('redundant')).not.toBeInTheDocument()

    const todoWidget = within(screen.getByTestId('dashboard-widget-todo'))
    expect(await todoWidget.findByText('2 left')).toBeInTheDocument()
    expect(todoWidget.getByText('Finalize IELTS Task 2 essay outline')).toBeInTheDocument()
    expect(todoWidget.getByText('Polish FluentA top-bar navigation')).toBeInTheDocument()

    const countdownWidget = within(screen.getByTestId('dashboard-widget-countdown'))
    expect(await countdownWidget.findByText('IELTS Academic Exam')).toBeInTheDocument()
    expect(countdownWidget.queryByText('Old memory')).not.toBeInTheDocument()

    const habitWidget = within(screen.getByTestId('dashboard-widget-habits'))
    expect(await habitWidget.findByText('2 / 3 today')).toBeInTheDocument()
    expect(habitWidget.getByText('Practice 15 IELTS Words')).toBeInTheDocument()
    expect(habitWidget.getByText('14 day streak')).toBeInTheDocument()
    expect(habitWidget.queryByText('Ignored Offday')).not.toBeInTheDocument()

    const projectWidget = within(screen.getByTestId('dashboard-widget-project'))
    expect(await projectWidget.findByText('FluentA v2.1 Roadmap')).toBeInTheDocument()
    expect(projectWidget.getByText('3')).toBeInTheDocument()
    expect(projectWidget.getByText('18')).toBeInTheDocument()
    expect(projectWidget.getByText('IELTS Band 8.0 Prep')).toBeInTheDocument()
    expect(projectWidget.queryByText('Archive Board')).not.toBeInTheDocument()

    const journalWidget = within(screen.getByTestId('dashboard-widget-journal'))
    expect(await journalWidget.findByText('2-day streak')).toBeInTheDocument()
    expect(await journalWidget.findByText('IELTS Band 8 Cohesion Connectors')).toBeInTheDocument()
    expect(journalWidget.getByText('2h ago')).toBeInTheDocument()
    expect(journalWidget.getByText('FluentA Architecture Overview')).toBeInTheDocument()
    expect(journalWidget.getByText('Jul 10')).toBeInTheDocument()
    expect(journalWidget.queryByText('Older draft')).not.toBeInTheDocument()

    const pulseWidget = within(screen.getByTestId('dashboard-widget-learning-pulse'))
    expect(await pulseWidget.findByText('86.4%')).toBeInTheDocument()
    expect(pulseWidget.getByText('142 / 248')).toBeInTheDocument()
    expect(pulseWidget.getByText('14 days')).toBeInTheDocument()
    expect(pulseWidget.getAllByTestId('learning-pulse-bar')).toHaveLength(7)
  })

  it('keeps Todo and Habit quick-toggle mutation contracts', async () => {
    adapters.listByDate.mockResolvedValue([todo()])
    adapters.listHabits.mockResolvedValue([habit()])
    const { queryClient } = renderDashboard()
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')

    fireEvent.click(await screen.findByRole('button', { name: 'Check todo Plan speaking practice' }))
    await waitFor(() => expect(adapters.updateTodo).toHaveBeenCalledWith('todo-1', { isCompleted: true }))
    await waitFor(() => expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['todo'] }))

    fireEvent.click(screen.getByRole('button', { name: 'Check habit Read English' }))
    const expectedDate = expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)
    await waitFor(() => expect(adapters.toggleHabitEntry).toHaveBeenCalledWith('habit-1', expectedDate))
    await waitFor(() => expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['habit'] }))
  })

  it('loads each widget independently and recovers a failed widget with query retry', async () => {
    const pending = new Promise(() => undefined)
    adapters.listByDate
      .mockReturnValueOnce(pending)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce([todo()])

    const firstMount = renderDashboard()
    expect(screen.getByLabelText('Loading Todo')).toHaveAttribute('aria-busy', 'true')
    expect(await screen.findByText('No reviews due today.')).toBeInTheDocument()
    expect(await screen.findByText('No upcoming events')).toBeInTheDocument()
    firstMount.unmount()

    renderDashboard()
    expect(await screen.findByText('Could not load Todo.')).toBeInTheDocument()
    expect(screen.getByText('No reviews due today.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retry loading Todo' }))
    expect(await screen.findByText('Plan speaking practice')).toBeInTheDocument()
    expect(screen.queryByText('Could not load Todo.')).not.toBeInTheDocument()
  })

  it('retains Todo state after failure, blocks duplicate saves and retries successfully', async () => {
    let rejectSave!: (reason: Error) => void
    adapters.listByDate.mockResolvedValue([todo()])
    adapters.updateTodo
      .mockImplementationOnce(() => new Promise((_, reject) => { rejectSave = reject }))
      .mockImplementationOnce(async () => {
        adapters.listByDate.mockResolvedValue([todo({ isCompleted: true })])
        return todo({ isCompleted: true })
      })

    renderDashboard()
    const toggle = await screen.findByRole('button', { name: 'Check todo Plan speaking practice' })
    fireEvent.click(toggle)
    await waitFor(() => expect(toggle).toBeDisabled())
    fireEvent.click(toggle)
    expect(adapters.updateTodo).toHaveBeenCalledTimes(1)

    await act(async () => rejectSave(new Error('save failed')))
    expect(await screen.findByText('Could not update Todo. Your previous state is unchanged.')).toBeInTheDocument()
    expect(toggle).toBeEnabled()
    expect(screen.queryByRole('button', { name: 'Uncheck todo Plan speaking practice' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Retry Todo update' }))
    expect(await screen.findByRole('button', { name: 'Uncheck todo Plan speaking practice' })).toBeEnabled()
    expect(adapters.updateTodo).toHaveBeenLastCalledWith('todo-1', { isCompleted: true })
    expect(screen.queryByText('Could not update Todo. Your previous state is unchanged.')).not.toBeInTheDocument()
  })

  it('retains Habit state on failure and retries the same day successfully', async () => {
    adapters.listHabits.mockResolvedValue([habit()])
    adapters.toggleHabitEntry
      .mockRejectedValueOnce(new Error('save failed'))
      .mockImplementationOnce(async () => {
        adapters.listHabits.mockResolvedValue([habit({ isCheckedToday: true })])
        return habit({ isCheckedToday: true })
      })

    renderDashboard()
    fireEvent.click(await screen.findByRole('button', { name: 'Check habit Read English' }))
    expect(await screen.findByText('Could not update Habit. Your previous state is unchanged.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Check habit Read English' })).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: 'Retry Habit update' }))
    expect(await screen.findByRole('button', { name: 'Uncheck habit Read English' })).toBeEnabled()
    expect(adapters.toggleHabitEntry).toHaveBeenLastCalledWith('habit-1', '2026-07-14')
  })

  it.each([
    ['2026-07-14', 'Today'],
    ['2026-07-15', '1 day left'],
    ['2026-07-16', '2 days left'],
  ])('counts calendar days until %s in UTC', async (targetDate, expected) => {
    adapters.listCountdowns.mockResolvedValue([
      { id: 'old', name: 'Past event', targetDate: '2026-07-13', isCompleted: false },
      { id: 'later', name: 'Later event', targetDate: '2026-08-01', isCompleted: false },
      { id: 'next', name: 'Nearest event', targetDate, isCompleted: false },
      { id: 'completed', name: 'Completed event', targetDate: '2026-07-14', isCompleted: true },
    ])

    renderDashboard()
    const widget = within(screen.getByTestId('dashboard-widget-countdown'))
    expect(await widget.findByText(expected)).toBeInTheDocument()
    expect(widget.getByText('Nearest event')).toBeInTheDocument()
    expect(widget.getByText(/^Until /)).toHaveAttribute('dateTime', targetDate)
    expect(widget.queryByText('Past event')).not.toBeInTheDocument()
    expect(widget.queryByText('Later event')).not.toBeInTheDocument()
    expect(widget.queryByText('Completed event')).not.toBeInTheDocument()
  })

  it('refreshes day-dependent widgets across UTC midnight', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
    vi.setSystemTime(new Date('2026-07-14T23:59:30Z'))
    adapters.listHabits.mockResolvedValue([habit()])
    adapters.toggleHabitEntry.mockRejectedValue(new Error('save failed'))
    adapters.listCountdowns.mockResolvedValue([
      { id: 'today', name: 'Today event', targetDate: '2026-07-14', isCompleted: false },
      { id: 'tomorrow', name: 'Tomorrow event', targetDate: '2026-07-15', isCompleted: false },
    ])

    const { queryClient } = renderDashboard()
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')

    expect(await screen.findByText('Today event')).toBeInTheDocument()
    fireEvent.click(await screen.findByRole('button', { name: 'Check habit Read English' }))
    expect(await screen.findByRole('button', { name: 'Retry Habit update' })).toBeEnabled()
    expect(adapters.toggleHabitEntry).toHaveBeenLastCalledWith('habit-1', '2026-07-14')

    await act(async () => { await vi.advanceTimersByTimeAsync(60_000) })

    expect(await screen.findByText('Tomorrow event')).toBeInTheDocument()
    expect(screen.queryByText('Today event')).not.toBeInTheDocument()
    expect(adapters.listByDate).toHaveBeenLastCalledWith('2026-07-15')
    expect(screen.queryByRole('button', { name: 'Retry Habit update' })).not.toBeInTheDocument()

    for (const queryKey of [
      ['todo'],
      ['habit'],
      ['countdown', 'events'],
      ['review', 'dashboard'],
      ['journal', 'entries'],
      ['analytics'],
    ]) {
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey, refetchType: 'all' })
    }
  })
})
