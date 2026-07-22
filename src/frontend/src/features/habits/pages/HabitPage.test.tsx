import { QueryClient } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders } from '@/app/providers'
import { HabitPage } from './HabitPage'
import { habitsRoutes } from '../habits.routes'

const api = vi.hoisted(() => ({
  listHabits: vi.fn(),
  createHabit: vi.fn(),
  updateHabit: vi.fn(),
  deleteHabit: vi.fn(),
  listHabitEntries: vi.fn(),
  toggleHabitEntry: vi.fn(),
}))

vi.mock('../api/habit.api', async (importOriginal) => ({
  ...await importOriginal<typeof import('../api/habit.api')>(),
  ...api,
}))

function todayInput() {
  const date = new Date()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function habit(overrides = {}) {
  return {
    id: 'habit-1',
    name: 'Read English',
    description: 'First line\nSecond line',
    icon: 'Book',
    frequency: 'Daily',
    customDays: [],
    reminderEnabled: true,
    startDate: todayInput(),
    goalDays: 21,
    reminderTime: '07:30',
    currentStreak: 2,
    longestStreak: 5,
    totalCheckIns: 4,
    isScheduledToday: true,
    isCheckedToday: false,
    monthlyCompletionRate: 25,
    isGoalCompleted: false,
    goalCompletedOn: null,
    remainingGoalDays: 17,
    canEditStartDate: false,
    createdAt: '2026-07-21T00:00:00Z',
    updatedAt: '2026-07-21T00:00:00Z',
    ...overrides,
  }
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(<AppProviders queryClient={queryClient}><HabitPage /></AppProviders>)
}

describe('HabitPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.listHabits.mockResolvedValue([habit()])
    api.listHabitEntries.mockResolvedValue([])
    api.toggleHabitEntry.mockResolvedValue({ habitId: 'habit-1', date: todayInput(), isCompleted: true, totalCheckIns: 5, isGoalCompleted: false })
    api.deleteHabit.mockResolvedValue(undefined)
  })

  it('renders selected-day rows and the four main detail statistics', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Read English' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: `Check Read English for selected date ${todayInput()}` })).toBeInTheDocument()
    expect(screen.getByRole('article', { name: 'Total check-ins: 4 Days' })).toBeInTheDocument()
    expect(screen.getByRole('article', { name: 'Monthly check-in rate: 25 %' })).toBeInTheDocument()
    expect(screen.getByRole('article', { name: 'Current streak: 2 Days' })).toBeInTheDocument()
    expect(screen.getByRole('article', { name: 'Longest streak: 5 Days' })).toBeInTheDocument()
    expect(screen.getByLabelText('Goal progress 4 of 21')).toBeInTheDocument()
    expect(screen.getByText(/First line/)).toHaveTextContent('First line Second line')
  })

  it('adds Start Date, Goal Days, and custom reminder time to the existing form', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Create habit' }))

    expect(screen.getByRole('dialog', { name: 'Create Habit' })).toBeInTheDocument()
    expect(screen.getByTestId('habit-start-date-input')).toHaveValue(todayInput())
    expect(screen.getByTestId('habit-goal-days-select')).toHaveValue('Forever')
    expect(screen.getByTestId('habit-reminder-time-input')).toHaveValue('20:00')
    expect(screen.getByLabelText('Description')).toBeInTheDocument()
  })

  it('removes the dedicated stats route', () => {
    expect(habitsRoutes.map((route) => route.path)).toEqual(['habits'])
  })

  it('requires confirmation before deleting a Habit', async () => {
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: 'Delete Read English' }))
    expect(await screen.findByRole('alertdialog', { name: 'Delete Habit?' })).toBeInTheDocument()
    expect(screen.getByText(/This action cannot be undone/)).toHaveTextContent('Read English')
    expect(api.deleteHabit).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(api.deleteHabit).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Delete Read English' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Delete Habit' }))
    await waitFor(() => expect(api.deleteHabit).toHaveBeenCalled())
    expect(api.deleteHabit.mock.calls[0]?.[0]).toBe('habit-1')
  })
})
