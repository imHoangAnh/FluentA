import { QueryClient } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
}))

vi.mock('@/features/todo', () => ({ listByDate: adapters.listByDate, updateTodo: adapters.updateTodo }))
vi.mock('@/lib/api/habit.api', () => ({ listHabits: adapters.listHabits, toggleHabitEntry: adapters.toggleHabitEntry }))
vi.mock('@/lib/api/countdown.api', () => ({ listCountdowns: adapters.listCountdowns }))
vi.mock('@/features/review', () => ({ getReviewDashboard: adapters.getReviewDashboard }))
vi.mock('@/routes/journal/JournalRichTextEditor', () => ({ JournalRichTextEditor: () => null }))

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

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({
      accessToken: 'dashboard-token',
      status: 'authenticated',
      error: null,
      user: { id: 'user-1', email: 'learner@example.com', fullName: 'Dashboard Learner', isEmailVerified: true },
    })
    adapters.listByDate.mockResolvedValue([])
    adapters.listHabits.mockResolvedValue([])
    adapters.listCountdowns.mockResolvedValue([])
    adapters.getReviewDashboard.mockResolvedValue({ overdue: 0, dueToday: 0, newCards: 0 })
    adapters.updateTodo.mockResolvedValue(todo({ isCompleted: true }))
    adapters.toggleHabitEntry.mockResolvedValue(habit({ isCheckedToday: true }))
  })

  it('renders current empty states, links, and local date/timezone queries', async () => {
    renderDashboard()

    expect(await screen.findByText('No cards due today')).toBeInTheDocument()
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
  })

  it('renders populated cross-domain widgets', async () => {
    adapters.listByDate.mockResolvedValue([todo()])
    adapters.listHabits.mockResolvedValue([habit()])
    adapters.listCountdowns.mockResolvedValue([{
      id: 'countdown-1',
      name: 'IELTS Exam',
      targetDate: '2026-12-20',
      isCompleted: false,
      alerts: [],
      createdAt: '2026-07-14T01:00:00Z',
      updatedAt: '2026-07-14T01:00:00Z',
    }])
    adapters.getReviewDashboard.mockResolvedValue({ overdue: 2, dueToday: 3, newCards: 4 })

    renderDashboard()

    expect(await screen.findByText('Plan speaking practice')).toBeInTheDocument()
    expect(screen.getByText('Read English')).toBeInTheDocument()
    expect(screen.getByText('IELTS Exam')).toBeInTheDocument()
    expect(screen.getByText('9 due')).toBeInTheDocument()
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
