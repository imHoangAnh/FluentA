import { CheckCircle2, Clock3, Pause, Play, RotateCcw, Settings, TimerReset } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as pomodoroApi from '../api/pomodoro.api'
import { pomodoroKeys } from '../api/pomodoro.queries'
import * as todoApi from '@/features/todo'
import * as projectApi from '@/features/project'
import { projectKeys } from '@/features/project'
import { PomodoroConfigurationDialog, type PomodoroConfigFormValues } from '../components/PomodoroConfigurationDialog'
import { SelectMenu } from '@/shared/components/ui/select-menu'

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${`${remainingSeconds}`.padStart(2, '0')}`
}

const defaultForm: PomodoroConfigFormValues = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakAfter: 4,
}

export function PomodoroPage() {
  const queryClient = useQueryClient()
  const [message, setMessage] = useState<string | null>(null)
  const [mode, setMode] = useState<'pomo' | 'stopwatch'>('pomo')
  const [configOpen, setConfigOpen] = useState(false)
  const [displaySeconds, setDisplaySeconds] = useState<number | null>(null)
  const [linkedTask, setLinkedTask] = useState('')
  const [stopwatchSeconds, setStopwatchSeconds] = useState(0)
  const [stopwatchRunning, setStopwatchRunning] = useState(false)
  const [laps, setLaps] = useState<number[]>([])
  const autoCompletedKey = useRef<string | null>(null)

  const configQuery = useQuery({
    queryKey: pomodoroKeys.config,
    queryFn: pomodoroApi.getPomodoroConfig,
  })

  const currentQuery = useQuery({
    queryKey: pomodoroKeys.current,
    queryFn: pomodoroApi.getPomodoroCurrent,
  })

  const todayQuery = useQuery({
    queryKey: pomodoroKeys.today,
    queryFn: pomodoroApi.getPomodoroToday,
  })
  const todosQuery = useQuery({
    queryKey: pomodoroKeys.todoToday,
    queryFn: () => todoApi.listByDate(new Date().toISOString().slice(0, 10)),
  })
  const boardsQuery = useQuery({ queryKey: projectKeys.boards, queryFn: projectApi.listBoards })
  const boardDetailsQuery = useQuery({
    queryKey: projectKeys.pomodoroCards(boardsQuery.data?.map((board) => board.id).join(',')),
    queryFn: () => Promise.all((boardsQuery.data ?? []).map((board) => projectApi.getBoard(board.id))),
    enabled: Boolean(boardsQuery.data?.length),
  })

  const updateConfig = useMutation({
    mutationFn: pomodoroApi.updatePomodoroConfig,
    onSuccess: async (saved) => {
      queryClient.setQueryData(pomodoroKeys.config, saved)
      setMessage(null)
      setConfigOpen(false)
      await queryClient.invalidateQueries({ queryKey: pomodoroKeys.all })
    },
    onError: () => setMessage('Could not save settings.'),
  })

  const timerCommand = useMutation({
    mutationFn: ({ command, startInput }: { command: 'start' | 'pause' | 'resume' | 'reset' | 'complete'; startInput?: pomodoroApi.StartPomodoroInput }) => ({
      start: () => pomodoroApi.startPomodoro(startInput),
      pause: pomodoroApi.pausePomodoro,
      resume: pomodoroApi.resumePomodoro,
      reset: pomodoroApi.resetPomodoro,
      complete: pomodoroApi.completePomodoro,
    })[command](),
    onSuccess: (state) => {
      queryClient.setQueryData(pomodoroKeys.current, state)
      void queryClient.invalidateQueries({ queryKey: pomodoroKeys.today })
      setMessage(null)
    },
    onError: () => setMessage('Error updating timer.'),
  })

  const current = currentQuery.data
  const currentForm = configQuery.data ?? defaultForm
  const shownSeconds = current ? (displaySeconds ?? current.remainingSeconds) : currentForm.workMinutes * 60
  const timerCommandPending = timerCommand.isPending
  const completeTimer = timerCommand.mutate

  useEffect(() => {
    if (!current) return
    const resetDisplay = window.setTimeout(() => setDisplaySeconds(current.remainingSeconds), 0)
    if (current.state !== 'Running') return () => window.clearTimeout(resetDisplay)

    const interval = window.setInterval(() => {
      setDisplaySeconds((seconds) => Math.max(0, (seconds ?? current.remainingSeconds) - 1))
    }, 1000)
    return () => {
      window.clearTimeout(resetDisplay)
      window.clearInterval(interval)
    }
  }, [current])

  useEffect(() => {
    if (!stopwatchRunning) return
    const interval = window.setInterval(() => setStopwatchSeconds((seconds) => seconds + 1), 1000)
    return () => window.clearInterval(interval)
  }, [stopwatchRunning])

  useEffect(() => {
    if (!current || current.state !== 'Running' || shownSeconds !== 0 || timerCommandPending) return
    const key = `${current.phase}:${current.startedAt}`
    if (autoCompletedKey.current === key) return
    autoCompletedKey.current = key
    completeTimer({ command: 'complete' }, {
      onSuccess: () => {
        const audio = new Audio('data:audio/wav;base64,UklGRjQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YRAAAACA////gP///4D///+A////')
        void audio.play().catch(() => undefined)
        if ('Notification' in window) {
          if (Notification.permission === 'granted') new Notification('Pomodoro phase complete')
          else if (Notification.permission === 'default') void Notification.requestPermission()
        }
      },
    })
  }, [completeTimer, current, shownSeconds, timerCommandPending])

  const projectCards = (boardDetailsQuery.data ?? []).flatMap((board) =>
    board.columns.flatMap((column) => column.cards.map((card) => ({ ...card, boardName: board.name }))),
  )

  const progressTotal = current?.durationSeconds ?? (currentForm.workMinutes * 60)
  const progressRatio = Math.min(1, Math.max(0, shownSeconds / progressTotal))
  const strokeDashoffset = 753.98 - (progressRatio * 753.98)
  const timerState = current?.state ?? 'Idle'
  const phaseLabel = current?.phase === 'ShortBreak' ? 'Short Break' : current?.phase === 'LongBreak' ? 'Long Break' : 'Focus'

  return (
    <main className="pomodoro-main">
      <div className="pomodoro-workspace-canvas">
        <div className="pomodoro-grid-container">
          <section className="pomodoro-left-column" aria-label="Focus timer workspace">
            <div className="pomodoro-workspace-toolbar">
              <div className="pomodoro-mode-switch" role="group" aria-label="Timer mode">
                <button type="button" className={mode === 'pomo' ? 'active' : undefined} aria-pressed={mode === 'pomo'} onClick={() => setMode('pomo')}>Pomo</button>
                <button type="button" className={mode === 'stopwatch' ? 'active' : undefined} aria-pressed={mode === 'stopwatch'} onClick={() => setMode('stopwatch')}>Stopwatch</button>
              </div>
              <button
                className="pomodoro-settings-trigger"
                type="button"
                aria-label="Open configuration"
                title="Configuration"
                onClick={() => { setMessage(null); setConfigOpen(true) }}
              >
                <Settings size={19} />
              </button>
            </div>

            {mode === 'pomo' ? (
              <section className="pomodoro-mode-panel pomodoro-timer-panel" aria-label="Pomodoro timer">
                <div className="pomodoro-session-heading">
                  <h2>{phaseLabel}</h2>
                  <span data-testid="pomodoro-state">{timerState}</span>
                </div>

                <div className="pomodoro-ring-container">
                  <svg className="pomodoro-ring-svg" viewBox="0 0 256 256" aria-hidden="true">
                    <circle className="ring-bg" cx="128" cy="128" r="120" />
                    <circle className="ring-progress" cx="128" cy="128" r="120" style={{ strokeDashoffset }} />
                  </svg>
                  <div className="pomodoro-ring-text">
                    <span className="timer-display" data-testid="pomodoro-current-time">{formatDuration(shownSeconds)}</span>
                    <span className="timer-label">remaining</span>
                  </div>
                </div>

                <div className="pomodoro-controls">
                  <button className="pomodoro-secondary-action" type="button" aria-label="Reset" title="Reset timer" onClick={() => timerCommand.mutate({ command: 'reset' })} disabled={timerCommandPending}>
                    <RotateCcw size={19} />
                  </button>

                  {timerState === 'Idle' ? (
                    <button className="pomodoro-primary-action" type="button" aria-label="Start" onClick={() => {
                      const [source, id] = linkedTask.split(':')
                      timerCommand.mutate({ command: 'start', startInput: id ? { linkedTaskId: id, linkedTaskSource: source as 'todo' | 'project' } : {} })
                    }} disabled={timerCommandPending || currentQuery.isLoading}>
                      <Play size={18} fill="currentColor" /> Start
                    </button>
                  ) : timerState === 'Running' ? (
                    <button className="pomodoro-primary-action" type="button" aria-label="Pause" onClick={() => timerCommand.mutate({ command: 'pause' })} disabled={timerCommandPending}>
                      <Pause size={18} fill="currentColor" /> Pause
                    </button>
                  ) : timerState === 'Paused' ? (
                    <button className="pomodoro-primary-action" type="button" aria-label="Resume" onClick={() => timerCommand.mutate({ command: 'resume' })} disabled={timerCommandPending}>
                      <Play size={18} fill="currentColor" /> Resume
                    </button>
                  ) : (
                    <button className="pomodoro-primary-action" type="button" aria-label="Reset" onClick={() => timerCommand.mutate({ command: 'reset' })} disabled={timerCommandPending}>
                      <RotateCcw size={18} /> Reset
                    </button>
                  )}

                  <button className="pomodoro-secondary-action" type="button" aria-label="Complete phase" title="Complete phase" onClick={() => timerCommand.mutate({ command: 'complete' })} disabled={timerCommandPending}>
                    <CheckCircle2 size={19} />
                  </button>
                </div>
              </section>
            ) : (
              <section className="pomodoro-mode-panel pomodoro-stopwatch-panel" aria-label="Stopwatch">
                <TimerReset className="pomodoro-stopwatch-icon" size={24} aria-hidden="true" />
                <div className="pomodoro-stopwatch-time" data-testid="stopwatch-time">{formatDuration(stopwatchSeconds)}</div>
                <div className="pomodoro-stopwatch-actions">
                  <button className="pomodoro-primary-action" type="button" aria-label={stopwatchRunning ? 'Pause stopwatch' : 'Start stopwatch'} onClick={() => setStopwatchRunning((running) => !running)}>
                    {stopwatchRunning ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                    {stopwatchRunning ? 'Pause' : 'Start'}
                  </button>
                  <button type="button" onClick={() => setLaps((currentLaps) => [...currentLaps, stopwatchSeconds])} disabled={stopwatchSeconds === 0}>Lap</button>
                  <button type="button" aria-label="Reset stopwatch" onClick={() => { setStopwatchRunning(false); setStopwatchSeconds(0); setLaps([]) }} disabled={stopwatchSeconds === 0}>Reset</button>
                </div>
                {laps.length > 0 ? (
                  <ol className="pomodoro-lap-list" aria-label="Stopwatch laps">
                    {laps.map((lap, index) => <li key={`${index}-${lap}`}><span>Lap {index + 1}</span><strong>{formatDuration(lap)}</strong></li>)}
                  </ol>
                ) : <p className="pomodoro-stopwatch-empty">Your laps will appear here.</p>}
              </section>
            )}
            {message && !configOpen ? <p className="pomodoro-inline-message" role="alert">{message}</p> : null}
          </section>

          <aside className="pomodoro-right-column">
            <section className="pomodoro-side-card pomodoro-stats-card">
              <h2>Daily Statistics</h2>
              <div className="pomodoro-stats-list">
                <div className="pomodoro-stat-item" data-testid="pomodoro-today-count">
                  <div className="pomodoro-stat-icon"><CheckCircle2 size={18} /></div>
                  <div>
                    <p>Completed today</p>
                    <strong data-testid="pomodoro-today-count-value">{todayQuery.data?.completedWorkSessions ?? 0}</strong>
                  </div>
                </div>
                <div className="pomodoro-stat-item">
                  <div className="pomodoro-stat-icon"><Clock3 size={18} /></div>
                  <div>
                    <p>Focus time</p>
                    <strong>{(todayQuery.data?.completedWorkSessions ?? 0) * currentForm.workMinutes} min</strong>
                  </div>
                </div>
              </div>
            </section>

            <section className="pomodoro-side-card pomodoro-task-card">
              <h2>Target Task</h2>
              <p>Select a task to link this session's effort.</p>
              <div className="pomodoro-select-wrapper">
                <SelectMenu
                  testId="pomodoro-task-select"
                  aria-label="Linked task"
                  value={linkedTask}
                  onChange={setLinkedTask}
                  disabled={timerState !== 'Idle'}
                  options={[
                    { value: '', label: 'No linked task' },
                    ...(todosQuery.data ?? []).map((todo) => ({ value: `todo:${todo.id}`, label: `Todo: ${todo.title}` })),
                    ...projectCards.map((card) => ({ value: `project:${card.id}`, label: `Project: ${card.boardName} / ${card.title}` })),
                  ]}
                />
              </div>
              {current?.linkedTaskId && timerState !== 'Idle' ? <p className="pomodoro-linked-status" data-testid="pomodoro-linked-task">Linked {current.linkedTaskSource} task</p> : null}
            </section>
          </aside>
        </div>
      </div>

      {configOpen ? (
        <PomodoroConfigurationDialog
          initialValues={currentForm}
          message={message}
          onOpenChange={setConfigOpen}
          onSubmit={(values) => { setMessage(null); updateConfig.mutate(values) }}
          open
          pending={updateConfig.isPending || configQuery.isLoading}
        />
      ) : null}
    </main>
  )
}
