import { QueryClient } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders } from '@/app/providers'
import { PomodoroPage } from './PomodoroPage'

const pomodoroApi = vi.hoisted(() => ({
  completePomodoro: vi.fn(),
  getPomodoroConfig: vi.fn(),
  getPomodoroCurrent: vi.fn(),
  getPomodoroToday: vi.fn(),
  pausePomodoro: vi.fn(),
  resetPomodoro: vi.fn(),
  resumePomodoro: vi.fn(),
  startPomodoro: vi.fn(),
  updatePomodoroConfig: vi.fn(),
}))

vi.mock('../api/pomodoro.api', async (importOriginal) => ({
  ...await importOriginal<typeof import('../api/pomodoro.api')>(),
  ...pomodoroApi,
}))

vi.mock('@/features/todo', () => ({
  listByDate: vi.fn().mockResolvedValue([{ id: 'todo-1', title: 'Read English' }]),
}))

vi.mock('@/features/project', () => ({
  getBoard: vi.fn(),
  listBoards: vi.fn().mockResolvedValue([]),
}))

const config = {
  id: 'config-1',
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakAfter: 4,
  createdAt: '2026-07-21T00:00:00Z',
  updatedAt: '2026-07-21T00:00:00Z',
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(<AppProviders queryClient={queryClient}><PomodoroPage /></AppProviders>)
}

describe('PomodoroPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    pomodoroApi.getPomodoroConfig.mockResolvedValue(config)
    pomodoroApi.getPomodoroCurrent.mockResolvedValue({ state: 'Idle', phase: 'Work', remainingSeconds: 1500, durationSeconds: 1500 })
    pomodoroApi.getPomodoroToday.mockResolvedValue({ completedWorkSessions: 2 })
    pomodoroApi.updatePomodoroConfig.mockImplementation(async (values) => ({ ...config, ...values }))
  })

  it('keeps Pomo and Stopwatch in one workspace with statistics and task panels on the right', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByRole('button', { name: 'Pomo' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('heading', { name: 'Daily Statistics' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Target Task' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Stopwatch' }))
    expect(screen.getByTestId('stopwatch-time')).toHaveTextContent('0:00')
    await user.click(screen.getByRole('button', { name: 'Start stopwatch' }))
    expect(screen.getByRole('button', { name: 'Pause stopwatch' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Pomo' }))
    await user.click(screen.getByRole('button', { name: 'Stopwatch' }))
    expect(screen.getByRole('button', { name: 'Pause stopwatch' })).toBeInTheDocument()
  })

  it('opens Configuration from the icon, discards Cancel changes, and saves through the existing API', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Open configuration' }))
    expect(screen.getByRole('dialog', { name: 'Configuration' })).toBeInTheDocument()
    fireEvent.change(screen.getByTestId('pomodoro-work-input'), { target: { value: '30' } })
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(pomodoroApi.updatePomodoroConfig).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Open configuration' }))
    expect(screen.getByTestId('pomodoro-work-input')).toHaveValue('25')
    fireEvent.change(screen.getByTestId('pomodoro-work-input'), { target: { value: '30' } })
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(pomodoroApi.updatePomodoroConfig.mock.calls[0]?.[0]).toEqual({
      workMinutes: 30,
      shortBreakMinutes: 5,
      longBreakMinutes: 15,
      longBreakAfter: 4,
    }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Configuration' })).not.toBeInTheDocument())
  })
})
