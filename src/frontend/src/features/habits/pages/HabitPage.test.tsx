import { QueryClient } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders } from '@/app/providers'
import { todayUtc } from '@/shared/lib/date'
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
  return todayUtc()
}

function habit(overrides = {}) {
  return {
    id: 'habit-1',
    name: 'Read English',
    description: 'First line\nSecond line',
    icon: 'Book',
    frequency: 'Daily',
    customDays: [],
    startDate: todayInput(),
    goalDays: 21,
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
    vi.resetAllMocks()
    api.listHabits.mockResolvedValue([habit()])
    api.listHabitEntries.mockResolvedValue([])
    api.toggleHabitEntry.mockResolvedValue({ habitId: 'habit-1', date: todayInput(), isCompleted: true, totalCheckIns: 5, isGoalCompleted: false })
    api.deleteHabit.mockResolvedValue({ deleted: true })
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

  it('keeps Start Date and Goal Days without reminders and submits tracking fields', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Create habit' }))

    expect(screen.getByRole('dialog', { name: 'Create Habit' })).toBeInTheDocument()
    expect(screen.getByTestId('habit-start-date-input')).toHaveValue(todayInput())
    expect(screen.getByTestId('habit-goal-days-select')).toHaveAttribute('data-value', 'Forever')
    expect(screen.queryByTestId('habit-reminder-time-input')).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: 'Reminder' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Description')).toBeInTheDocument()
    api.createHabit.mockResolvedValue(habit())
    fireEvent.change(screen.getByTestId('habit-name-input'), { target: { value: 'Read daily' } })
    fireEvent.click(screen.getByTestId('save-habit-button'))
    await waitFor(() => expect(api.createHabit).toHaveBeenCalled())
    const payload = api.createHabit.mock.calls[0][0]
    expect(payload).toMatchObject({ name: 'Read daily', startDate: todayInput(), goalDays: null, frequency: 'Daily' })
    expect(payload).not.toHaveProperty('reminderEnabled')
    expect(payload).not.toHaveProperty('reminderTime')
  })

  it('allows choosing a different habit icon from the form dropdown', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Create habit' }))

    const iconButton = screen.getByRole('button', { name: 'Habit icon' })
    fireEvent.click(iconButton)
    fireEvent.click(await screen.findByRole('option', { name: 'Exercise' }))

    expect(iconButton).toHaveTextContent('Exercise')
  })

  it('removes the dedicated stats route', () => {
    expect(habitsRoutes.map((route) => route.path)).toEqual(['habits'])
  })

  it('cancels deletion without an API call, then hides a confirmed deleted Habit', async () => {
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: 'Delete Read English' }))
    expect(api.deleteHabit).not.toHaveBeenCalled()
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancel' }))
    expect(api.deleteHabit).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: 'Read English' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Delete Read English' }))
    api.listHabits.mockResolvedValue([])
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete Habit' }))
    await waitFor(() => expect(api.deleteHabit).toHaveBeenCalled())
    expect(api.deleteHabit.mock.calls[0]?.[0]).toBe('habit-1')
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Read English' })).not.toBeInTheDocument())
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument()
  })

  it('keeps the Habit and confirmation open after a failed delete, allowing retry', async () => {
    api.deleteHabit.mockRejectedValueOnce(new Error('Storage unavailable'))
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Delete Read English' }))
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete Habit' }))
    await screen.findByText('Could not delete the habit. Please try again.')
    expect(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete Habit' })).toBeEnabled()
    expect(screen.getByRole('heading', { name: 'Read English', hidden: true })).toBeInTheDocument()
    api.listHabits.mockResolvedValue([])
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete Habit' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(api.deleteHabit).toHaveBeenCalledTimes(2)
  })

  it('refreshes tracking locally after check-in without a realtime connection', async () => {
    renderPage()
    const checkButton = await screen.findByRole('button', { name: `Check Read English for selected date ${todayInput()}` })
    api.listHabits.mockResolvedValue([habit({ totalCheckIns: 5, remainingGoalDays: 16, isCheckedToday: true })])
    api.listHabitEntries.mockResolvedValue([{ habitId: 'habit-1', date: todayInput(), isCompleted: true }])
    fireEvent.click(checkButton)
    await waitFor(() => expect(screen.getByLabelText('Goal progress 5 of 21')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: `Uncheck Read English for selected date ${todayInput()}` })).toBeInTheDocument()
  })
})
