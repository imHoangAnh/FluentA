import { QueryClient } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders } from '@/app/providers'
import { useAuthStore } from '@/features/auth'
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage'
import { DASHBOARD_WIDGET_STORAGE_KEY } from '@/features/dashboard/dashboard-widget-preferences'

const adapters = vi.hoisted(() => ({
  listByDate: vi.fn(),
  updateTodo: vi.fn(),
  listHabits: vi.fn(),
  toggleHabitEntry: vi.fn(),
  listCountdowns: vi.fn(),
  getReviewDashboard: vi.fn(),
  listBoards: vi.fn(),
  getPomodoroCurrent: vi.fn(),
  getPomodoroToday: vi.fn(),
}))

vi.mock('@/features/todo', () => ({ listByDate: adapters.listByDate, updateTodo: adapters.updateTodo }))
vi.mock('@/features/habits', () => ({ listHabits: adapters.listHabits, toggleHabitEntry: adapters.toggleHabitEntry, HabitIconGlyph: () => null }))
vi.mock('@/features/countdown', () => ({ listCountdowns: adapters.listCountdowns }))
vi.mock('@/features/review', () => ({ getReviewDashboard: adapters.getReviewDashboard }))
vi.mock('@/features/project', () => ({ listBoards: adapters.listBoards }))
vi.mock('@/features/pomodoro', () => ({ getPomodoroCurrent: adapters.getPomodoroCurrent, getPomodoroToday: adapters.getPomodoroToday }))
vi.mock('@/features/journal', () => ({ JournalRichTextEditor: () => null }))

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
    useAuthStore.setState({
      status: 'authenticated',
      error: null,
      user: { id: 'user-1', email: 'learner@example.com', fullName: 'Dashboard Learner', isEmailVerified: true },
    })
    adapters.listByDate.mockResolvedValue([])
    adapters.listHabits.mockResolvedValue([])
    adapters.listCountdowns.mockResolvedValue([])
    adapters.getReviewDashboard.mockResolvedValue({ overdue: 0, dueToday: 0, newCards: 0 })
    adapters.listBoards.mockResolvedValue([])
    adapters.getPomodoroCurrent.mockResolvedValue({ state: 'Idle', phase: 'Work', remainingSeconds: 0, durationSeconds: 0 })
    adapters.getPomodoroToday.mockResolvedValue({ completedWorkSessions: 0 })
    adapters.updateTodo.mockResolvedValue(todo({ isCompleted: true }))
    adapters.toggleHabitEntry.mockResolvedValue(habit({ isCheckedToday: true }))
  })

  it('renders current empty states, links, and local date/timezone queries', async () => {
    renderDashboard(['review', 'todo', 'countdown', 'habits'])

    expect(await screen.findByText('No reviews due today.')).toBeInTheDocument()
    expect(screen.getByText('No tasks for today.')).toBeInTheDocument()
    expect(screen.getByText('No habits scheduled today.')).toBeInTheDocument()
    expect(screen.getByText('No upcoming events')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open Review' })).toHaveAttribute('href', '/review')
    expect(screen.getByRole('link', { name: 'View all tasks' })).toHaveAttribute('href', '/todo')
    expect(screen.getByRole('link', { name: 'Open countdowns' })).toHaveAttribute('href', '/countdowns')

    expect(adapters.listByDate).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/))
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    expect(adapters.listHabits).toHaveBeenCalledWith(timeZone)
    expect(adapters.getReviewDashboard).toHaveBeenCalledWith(timeZone)
    expect(adapters.listBoards).not.toHaveBeenCalled()
    expect(adapters.getPomodoroCurrent).not.toHaveBeenCalled()
    expect(adapters.getPomodoroToday).not.toHaveBeenCalled()
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
    adapters.getReviewDashboard.mockResolvedValue({ overdue: 2, dueToday: 3, newCards: 4 })

    renderDashboard(['review', 'todo', 'countdown', 'habits'])

    expect(await screen.findByText('Plan speaking practice')).toBeInTheDocument()
    expect(screen.getByText('Read English')).toBeInTheDocument()
    expect(screen.getByText('IELTS Exam')).toBeInTheDocument()
    expect(screen.queryByText('Old memory')).not.toBeInTheDocument()
    expect(screen.getByTestId('dashboard-review-due-badge')).toHaveTextContent('5 due')
    expect(within(screen.getByTestId('dashboard-review-due-ring')).getByText('5')).toBeInTheDocument()
    expect(within(screen.getByTestId('dashboard-review-count')).getByText('5')).toBeInTheDocument()
    expect(within(screen.getByTestId('dashboard-learning-count')).getByText('4')).toBeInTheDocument()
  })

  it('keeps new learning words out of the Due Today count', async () => {
    adapters.getReviewDashboard.mockResolvedValue({ overdue: 0, dueToday: 0, newCards: 7 })

    renderDashboard(['review', 'todo', 'countdown', 'habits'])

    const ring = await screen.findByTestId('dashboard-review-due-ring')
    expect(ring).toHaveAttribute('aria-label', '0 words due for review today. 7 new words available to learn.')
    expect(within(ring).getByText('0')).toBeInTheDocument()
    expect(screen.getByTestId('dashboard-review-due-badge')).toHaveTextContent('0 due')
    expect(within(screen.getByTestId('dashboard-review-count')).getByText('0')).toBeInTheDocument()
    expect(within(screen.getByTestId('dashboard-learning-count')).getByText('7')).toBeInTheDocument()
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
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    await waitFor(() => expect(adapters.toggleHabitEntry).toHaveBeenCalledWith('habit-1', expectedDate, timeZone))
    await waitFor(() => expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['habit'] }))
  })

  it('preserves the structured loading state', () => {
    const pending = new Promise(() => undefined)
    adapters.listByDate.mockReturnValue(pending)
    adapters.listHabits.mockReturnValue(pending)
    adapters.listCountdowns.mockReturnValue(pending)
    adapters.getReviewDashboard.mockReturnValue(pending)

    renderDashboard()

    expect(screen.getByLabelText('Loading dashboard')).toHaveAttribute('aria-busy', 'true')
  })
})
