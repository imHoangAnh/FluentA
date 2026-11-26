import { QueryClient } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders } from '@/app/providers'
import { useAuthStore } from '@/features/auth'
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage'
import { DASHBOARD_WIDGET_STORAGE_KEY } from '@/features/dashboard/model/dashboard-widget-preferences'
import { APP_TIME_ZONE } from '@/shared/lib/timezone'

const adapters = vi.hoisted(() => ({
  listByDate: vi.fn(),
  updateTodo: vi.fn(),
  listHabits: vi.fn(),
  toggleHabitEntry: vi.fn(),
  listCountdowns: vi.fn(),
  getReviewDashboard: vi.fn(),
  listBoards: vi.fn(),
}))

vi.mock('@/features/todo', () => ({
  listByDate: adapters.listByDate,
  updateTodo: adapters.updateTodo,
  todoKeys: { all: ['todo'], day: (date: string) => ['todo', 'items', date] },
}))
vi.mock('@/features/habits', () => ({
  listHabits: adapters.listHabits,
  toggleHabitEntry: adapters.toggleHabitEntry,
  HabitIconGlyph: () => null,
  habitKeys: { all: ['habit'], list: (timeZoneId: string) => ['habit', 'list', timeZoneId] },
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

function renderDashboard(order = ['review', 'todo', 'countdown']) {
  window.localStorage.setItem(DASHBOARD_WIDGET_STORAGE_KEY, JSON.stringify({ version: 1, order }))
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

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-07-14T16:30:00Z'))
    useAuthStore.setState({
      status: 'authenticated',
      error: null,
      user: { id: 'user-1', fullName: 'Dashboard Learner', avatarUrl: null },
    })
    adapters.listByDate.mockResolvedValue([])
    adapters.listHabits.mockResolvedValue([])
    adapters.listCountdowns.mockResolvedValue([])
    adapters.getReviewDashboard.mockResolvedValue({ localDate: '2026-07-14', dueCount: 0 })
    adapters.listBoards.mockResolvedValue([])
    adapters.updateTodo.mockResolvedValue(todo({ isCompleted: true }))
    adapters.toggleHabitEntry.mockResolvedValue(habit({ isCheckedToday: true }))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders current empty states, links, and local date/timezone queries', async () => {
    renderDashboard(['review', 'todo', 'countdown', 'habits'])

    expect(await screen.findByText('No reviews due today.')).toBeInTheDocument()
    expect(screen.getByText('No tasks for today.')).toBeInTheDocument()
    expect(screen.getByText('No habits scheduled today.')).toBeInTheDocument()
    expect(screen.getByText('No upcoming events')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open Review' })).toBeEnabled()
    expect(screen.getByRole('link', { name: 'View all tasks' })).toHaveAttribute('href', '/todo')
    expect(screen.getByRole('link', { name: 'Open countdowns' })).toHaveAttribute('href', '/countdowns')

    expect(adapters.listByDate).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/))
    expect(adapters.listHabits).toHaveBeenCalledWith(APP_TIME_ZONE)
    expect(adapters.getReviewDashboard).toHaveBeenCalledWith(APP_TIME_ZONE)
    expect(adapters.listBoards).not.toHaveBeenCalled()
  })

  it('renders populated cross-domain widgets', async () => {
    adapters.listByDate.mockResolvedValue([todo()])
    adapters.listHabits.mockResolvedValue([habit()])
    adapters.listCountdowns.mockResolvedValue([{
      id: 'countdown-completed',
      name: 'Old memory',
      targetDate: '2025-12-20',
      isCompleted: true,
      alerts: [],
      createdAt: '2025-07-14T01:00:00Z',
      updatedAt: '2025-07-14T01:00:00Z',
    }, {
      id: 'countdown-1',
      name: 'IELTS Exam',
      targetDate: '2026-12-20',
      isCompleted: false,
      alerts: [],
      createdAt: '2026-07-14T01:00:00Z',
      updatedAt: '2026-07-14T01:00:00Z',
    }])
    adapters.getReviewDashboard.mockResolvedValue({ localDate: '2026-07-14', dueCount: 5 })

    renderDashboard(['review', 'todo', 'countdown', 'habits'])

    expect(await screen.findByText('Plan speaking practice')).toBeInTheDocument()
    expect(screen.getByText('Read English')).toBeInTheDocument()
    expect(screen.getByText('IELTS Exam')).toBeInTheDocument()
    expect(screen.queryByText('Old memory')).not.toBeInTheDocument()
    expect(screen.getByTestId('dashboard-review-due-badge')).toHaveTextContent('5 due')
    expect(within(screen.getByTestId('dashboard-review-due-ring')).getByText('5')).toBeInTheDocument()
    expect(within(screen.getByTestId('dashboard-review-count')).getByText('5')).toBeInTheDocument()
  })

  it('shows only the Review due count', async () => {
    adapters.getReviewDashboard.mockResolvedValue({ localDate: '2026-07-14', dueCount: 0 })

    renderDashboard(['review', 'todo', 'countdown', 'habits'])

    const ring = await screen.findByTestId('dashboard-review-due-ring')
    expect(ring).toHaveAttribute('aria-label', '0 words due for review today.')
    expect(within(ring).getByText('0')).toBeInTheDocument()
    expect(screen.getByTestId('dashboard-review-due-badge')).toHaveTextContent('0 due')
    expect(within(screen.getByTestId('dashboard-review-count')).getByText('0')).toBeInTheDocument()
    expect(screen.getByText('No reviews due today.')).toBeInTheDocument()
  })

  it('keeps Todo and Habit quick-toggle mutation contracts', async () => {
    adapters.listByDate.mockResolvedValue([todo()])
    adapters.listHabits.mockResolvedValue([habit()])
    const { queryClient } = renderDashboard(['review', 'todo', 'countdown', 'habits'])
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')

    fireEvent.click(await screen.findByRole('button', { name: 'Check todo Plan speaking practice' }))
    await waitFor(() => expect(adapters.updateTodo).toHaveBeenCalledWith('todo-1', { isCompleted: true }))
    await waitFor(() => expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['todo'] }))

    fireEvent.click(screen.getByRole('button', { name: 'Check habit Read English' }))
    const expectedDate = expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)
    await waitFor(() => expect(adapters.toggleHabitEntry).toHaveBeenCalledWith('habit-1', expectedDate, APP_TIME_ZONE))
    await waitFor(() => expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['habit'] }))
  })

  it('loads each widget independently while keeping its controls visible', async () => {
    const pending = new Promise(() => undefined)
    adapters.listByDate.mockReturnValue(pending)

    renderDashboard()

    expect(screen.getByLabelText('Loading Todo')).toHaveAttribute('aria-busy', 'true')
    expect(await screen.findByText('No reviews due today.')).toBeInTheDocument()
    expect(await screen.findByText('No upcoming events')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Move Todo widget' })).toBeEnabled()
  })

  it('isolates a failed widget and recovers it with query retry', async () => {
    adapters.listByDate.mockRejectedValueOnce(new Error('offline')).mockResolvedValue([todo()])
    renderDashboard()

    expect(await screen.findByText('Could not load Todo.')).toBeInTheDocument()
    expect(screen.getByText('No reviews due today.')).toBeInTheDocument()
    expect(screen.getByText('No upcoming events')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retry loading Todo' }))
    expect(await screen.findByText('Plan speaking practice')).toBeInTheDocument()
    expect(screen.queryByText('Could not load Todo.')).not.toBeInTheDocument()
  })

  it('retains Todo state after failure, blocks duplicate saves and retries successfully', async () => {
    let rejectSave!: (reason: Error) => void
    adapters.listByDate.mockResolvedValue([todo()])
    adapters.updateTodo.mockImplementationOnce(() => new Promise((_, reject) => { rejectSave = reject }))
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
    adapters.toggleHabitEntry.mockRejectedValueOnce(new Error('save failed')).mockImplementationOnce(async () => {
      adapters.listHabits.mockResolvedValue([habit({ isCheckedToday: true })])
      return habit({ isCheckedToday: true })
    })
    renderDashboard(['todo', 'habits', 'project'])
    fireEvent.click(await screen.findByRole('button', { name: 'Check habit Read English' }))
    expect(await screen.findByText('Could not update Habit. Your previous state is unchanged.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Check habit Read English' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Retry Habit update' }))
    expect(await screen.findByRole('button', { name: 'Uncheck habit Read English' })).toBeEnabled()
    expect(adapters.toggleHabitEntry).toHaveBeenLastCalledWith('habit-1', '2026-07-14', APP_TIME_ZONE)
  })

  it.each([
    ['2026-07-14', 'Today'],
    ['2026-07-15', '1 day left'],
    ['2026-07-16', '2 days left'],
  ])('counts calendar days until %s near Vietnam midnight', async (targetDate, expected) => {
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

  it('limits Todo/Habit previews and shows Project totals across all boards', async () => {
    adapters.listByDate.mockResolvedValue([
      todo({ id: 'done', title: 'Completed task', isCompleted: true }),
      ...[3, 1, 2, 4].map(i => todo({ id: `t${i}`, title: `Task ${i}`, createdAt: `2026-07-14T0${i}:00:00Z` })),
    ])
    adapters.listHabits.mockResolvedValue([
      habit({ id: 'not-today', name: 'Not scheduled', isScheduledToday: false }),
      ...[1, 2, 3, 4].map(i => habit({ id: `h${i}`, name: `Habit ${i}` })),
    ])
    adapters.listBoards.mockResolvedValue([1, 2, 3, 4].map(i => ({ id: `b${i}`, name: `Board ${i}`, cardCount: i })))
    renderDashboard(['todo', 'habits', 'project'])
    expect(await screen.findByText('Task 1')).toBeInTheDocument()
    const todoWidget = within(screen.getByTestId('dashboard-widget-todo'))
    expect(todoWidget.getAllByRole('button', { name: /^Check todo/ }).map(button => button.textContent)).toEqual(['Task 1', 'Task 2', 'Task 3'])
    expect(todoWidget.queryByText('Completed task')).not.toBeInTheDocument()
    const habitWidget = within(screen.getByTestId('dashboard-widget-habits'))
    expect(await habitWidget.findAllByRole('button', { name: /^Check habit/ })).toHaveLength(3)
    expect(habitWidget.queryByText('Not scheduled')).not.toBeInTheDocument()
    expect(habitWidget.queryByText('Habit 4')).not.toBeInTheDocument()
    const projectWidget = within(screen.getByTestId('dashboard-widget-project'))
    expect(await projectWidget.findByText('10')).toBeInTheDocument()
    expect(projectWidget.getByText('4')).toBeInTheDocument()
    expect(projectWidget.getAllByRole('listitem')).toHaveLength(3)
    expect(projectWidget.queryByText('Board 4')).not.toBeInTheDocument()
  })

  it('refreshes day-dependent widgets across Vietnam midnight', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
    vi.setSystemTime(new Date('2026-07-14T16:59:30Z'))
    adapters.listHabits.mockResolvedValue([habit()])
    adapters.toggleHabitEntry.mockRejectedValue(new Error('save failed'))
    adapters.listCountdowns.mockResolvedValue([
      { id: 'today', name: 'Today event', targetDate: '2026-07-14', isCompleted: false },
      { id: 'tomorrow', name: 'Tomorrow event', targetDate: '2026-07-15', isCompleted: false },
    ])
    const { queryClient } = renderDashboard(['review', 'todo', 'countdown', 'habits'])
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
    expect(await screen.findByText('Today event')).toBeInTheDocument()
    fireEvent.click(await screen.findByRole('button', { name: 'Check habit Read English' }))
    expect(await screen.findByRole('button', { name: 'Retry Habit update' })).toBeEnabled()
    expect(adapters.toggleHabitEntry).toHaveBeenLastCalledWith('habit-1', '2026-07-14', APP_TIME_ZONE)
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000) })
    expect(await screen.findByText('Tomorrow event')).toBeInTheDocument()
    expect(screen.queryByText('Today event')).not.toBeInTheDocument()
    expect(adapters.listByDate).toHaveBeenLastCalledWith('2026-07-15')
    expect(screen.queryByRole('button', { name: 'Retry Habit update' })).not.toBeInTheDocument()
    for (const queryKey of [['todo'], ['habit'], ['countdown', 'events'], ['review', 'dashboard']]) {
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey, refetchType: 'all' })
    }
  })
})
