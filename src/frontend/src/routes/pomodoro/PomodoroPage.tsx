import { Bell, CheckCircle2, CheckSquare, Clock3, Pause, Play, RotateCcw, Settings, TimerReset } from 'lucide-react'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as pomodoroApi from '../../lib/api/pomodoro.api'
import * as todoApi from '../../lib/api/todo.api'
import * as kanbanApi from '../../lib/api/kanban.api'
import { AppShell } from '@/components/AppShell'

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${`${remainingSeconds}`.padStart(2, '0')}`
}

type ConfigForm = {
  workMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  longBreakAfter: number
}

const defaultForm: ConfigForm = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakAfter: 4,
}

export function PomodoroPage() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<ConfigForm | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [displaySeconds, setDisplaySeconds] = useState<number | null>(null)
  const [linkedTask, setLinkedTask] = useState('')
  const [stopwatchSeconds, setStopwatchSeconds] = useState(0)
  const [stopwatchRunning, setStopwatchRunning] = useState(false)
  const [laps, setLaps] = useState<number[]>([])
  const autoCompletedKey = useRef<string | null>(null)

  const configQuery = useQuery({
    queryKey: ['pomodoro', 'config'],
    queryFn: pomodoroApi.getPomodoroConfig,
  })

  const currentQuery = useQuery({
    queryKey: ['pomodoro', 'current'],
    queryFn: pomodoroApi.getPomodoroCurrent,
  })

  const todayQuery = useQuery({
    queryKey: ['pomodoro', 'today'],
    queryFn: pomodoroApi.getPomodoroToday,
  })
  const todosQuery = useQuery({
    queryKey: ['todos', 'pomodoro-today'],
    queryFn: () => todoApi.listByDate(new Date().toISOString().slice(0, 10)),
  })
  const boardsQuery = useQuery({ queryKey: ['kanban', 'boards'], queryFn: kanbanApi.listBoards })
  const boardDetailsQuery = useQuery({
    queryKey: ['kanban', 'pomodoro-cards', boardsQuery.data?.map((board) => board.id).join(',')],
    queryFn: () => Promise.all((boardsQuery.data ?? []).map((board) => kanbanApi.getBoard(board.id))),
    enabled: Boolean(boardsQuery.data?.length),
  })

  const updateConfig = useMutation({
    mutationFn: pomodoroApi.updatePomodoroConfig,
    onSuccess: async (saved) => {
      setForm({
        workMinutes: saved.workMinutes,
        shortBreakMinutes: saved.shortBreakMinutes,
        longBreakMinutes: saved.longBreakMinutes,
        longBreakAfter: saved.longBreakAfter,
      })
      setMessage('Settings saved.')
      await queryClient.invalidateQueries({ queryKey: ['pomodoro'] })
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
      queryClient.setQueryData(['pomodoro', 'current'], state)
      void queryClient.invalidateQueries({ queryKey: ['pomodoro', 'today'] })
      setMessage(null)
    },
    onError: () => setMessage('Error updating timer.'),
  })

  function submitConfig(event: FormEvent) {
    event.preventDefault()
    setMessage(null)
    updateConfig.mutate(currentForm)
  }

  const current = currentQuery.data
  const currentForm = form ?? configQuery.data ?? defaultForm
  const shownSeconds = displaySeconds ?? current?.remainingSeconds ?? 0
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

  const kanbanCards = (boardDetailsQuery.data ?? []).flatMap((board) =>
    board.columns.flatMap((column) => column.cards.map((card) => ({ ...card, boardName: board.name }))),
  )

  const progressTotal = current?.durationSeconds ?? (currentForm.workMinutes * 60);
  const progressRatio = shownSeconds / progressTotal;
  const strokeDashoffset = 753.98 - (progressRatio * 753.98);

  return (
    <AppShell title="Pomodoro" description="Focus with a server-synchronized timer.">
      <main className="pomodoro-main">
        <header className="pomodoro-header">
          <div className="pomodoro-header-title">
            <h2>Focus Timer</h2>
          </div>
          <div className="pomodoro-header-actions">
            <div className="notification-icon">
              <Bell size={24} />
              <span className="notification-dot"></span>
            </div>
          </div>
        </header>

        <div className="pomodoro-workspace-canvas">
          <div className="pomodoro-grid-container">
            {/* Center Focus Area */}
            <section className="pomodoro-left-column">
              {/* Active Timer Card */}
              <div className="pomodoro-glass-card pomodoro-timer-card">
                <div className="pomodoro-timer-badge">
                  <span className="pulse-dot"></span>
                  <span className="badge-text">{current?.phase || 'Focus'} Session</span>
                  <strong data-testid="pomodoro-state">{current?.state ?? 'Idle'}</strong>
                </div>
                
                {/* Progress Ring */}
                <div className="pomodoro-ring-container">
                  <svg className="pomodoro-ring-svg">
                    <circle className="ring-bg" cx="128" cy="128" r="120" />
                    <circle 
                      className="ring-progress" 
                      cx="128" cy="128" r="120" 
                      style={{ strokeDashoffset }}
                    />
                  </svg>
                  <div className="pomodoro-ring-text">
                    <span className="timer-display" data-testid="pomodoro-current-time">{current ? formatDuration(shownSeconds) : '--:--'}</span>
                    <span className="timer-label">remaining</span>
                  </div>
                </div>

                {/* Controls */}
                <div className="pomodoro-controls">
                  <button className="control-btn secondary" type="button" aria-label="Reset" onClick={() => timerCommand.mutate({ command: 'reset' })} disabled={timerCommand.isPending}>
                    <RotateCcw size={24} />
                  </button>
                  
                  {current?.state === 'Idle' ? (
                    <button className="control-btn primary" type="button" aria-label="Start" onClick={() => {
                      const [source, id] = linkedTask.split(':')
                      timerCommand.mutate({ command: 'start', startInput: id ? { linkedTaskId: id, linkedTaskSource: source as 'todo' | 'kanban' } : {} })
                    }} disabled={timerCommand.isPending}>
                      <Play size={40} fill="currentColor" />
                    </button>
                  ) : current?.state === 'Running' ? (
                    <button className="control-btn primary" type="button" aria-label="Pause" onClick={() => timerCommand.mutate({ command: 'pause' })} disabled={timerCommand.isPending}>
                      <Pause size={40} fill="currentColor" />
                    </button>
                  ) : current?.state === 'Paused' ? (
                    <button className="control-btn primary" type="button" aria-label="Resume" onClick={() => timerCommand.mutate({ command: 'resume' })} disabled={timerCommand.isPending}>
                      <Play size={40} fill="currentColor" />
                    </button>
                  ) : (
                    <button className="control-btn primary" type="button" aria-label="Reset" onClick={() => timerCommand.mutate({ command: 'reset' })} disabled={timerCommand.isPending}>
                      <RotateCcw size={40} />
                    </button>
                  )}

                  <button className="control-btn secondary" type="button" aria-label="Complete phase" onClick={() => timerCommand.mutate({ command: 'complete' })} disabled={timerCommand.isPending}>
                    <CheckCircle2 size={24} />
                  </button>
                </div>
              </div>

              {/* Lower Grid: Task & Stopwatch */}
              <div className="pomodoro-lower-grid">
                {/* Task Integration */}
                <div className="pomodoro-glass-card pomodoro-task-card">
                  <div className="card-header">
                    <h3>Target Task</h3>
                    <CheckSquare size={24} className="icon-primary" />
                  </div>
                  <p>Select a task to link this session's effort.</p>
                  <div className="select-wrapper">
                    <select data-testid="pomodoro-task-select" aria-label="Linked task" value={linkedTask} onChange={(event) => setLinkedTask(event.target.value)} disabled={current?.state !== 'Idle'}>
                      <option value="">No linked task</option>
                      {(todosQuery.data ?? []).map((todo) => <option key={todo.id} value={`todo:${todo.id}`}>Todo: {todo.title}</option>)}
                      {kanbanCards.map((card) => <option key={card.id} value={`kanban:${card.id}`}>Kanban: {card.boardName} / {card.title}</option>)}
                    </select>
                  </div>
                  {current?.linkedTaskId && current?.state !== 'Idle' && <p className="linked-status" data-testid="pomodoro-linked-task">Linked {current.linkedTaskSource} task</p>}
                </div>

                {/* Stopwatch Section */}
                <div className="pomodoro-glass-card pomodoro-stopwatch-card">
                  <div className="card-header">
                    <h3>Stopwatch</h3>
                    <TimerReset size={24} className="icon-primary" />
                  </div>
                  <div className="stopwatch-row">
                    <div className="stopwatch-time" data-testid="stopwatch-time">{formatDuration(stopwatchSeconds)}</div>
                    <button className="btn-stopwatch" type="button" aria-label={stopwatchRunning ? 'Pause stopwatch' : 'Start stopwatch'} onClick={() => setStopwatchRunning((r) => !r)}>
                      {stopwatchRunning ? 'Pause' : 'Start Freeform'}
                    </button>
                  </div>
                  {stopwatchSeconds > 0 && (
                     <div className="stopwatch-actions">
                        <button className="btn-lap" type="button" onClick={() => setLaps((v) => [...v, stopwatchSeconds])}>Lap</button>
                        <button className="btn-reset" type="button" aria-label="Reset stopwatch" onClick={() => { setStopwatchRunning(false); setStopwatchSeconds(0); setLaps([]) }}>Reset</button>
                     </div>
                  )}
                  {laps.length > 0 && (
                     <ul className="lap-list">
                        {laps.map((lap, idx) => <li key={`${idx}-${lap}`}>Lap {idx+1}: {formatDuration(lap)}</li>)}
                     </ul>
                  )}
                </div>
              </div>
            </section>

            {/* Sidebar Stats & Settings */}
            <aside className="pomodoro-right-column">
              {/* Daily Statistics */}
              <div className="pomodoro-glass-card pomodoro-stats-card">
                <h3>Daily Statistics</h3>
                <div className="stats-list">
                  <div className="stat-item" data-testid="pomodoro-today-count">
                    <div className="stat-icon-wrapper">
                      <CheckCircle2 size={24} />
                    </div>
                    <div className="stat-info">
                      <p className="stat-label">Completed today</p>
                      <p className="stat-value" data-testid="pomodoro-today-count-value">{todayQuery.data?.completedWorkSessions ?? 0}</p>
                    </div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-icon-wrapper">
                      <Clock3 size={24} />
                    </div>
                    <div className="stat-info">
                      <p className="stat-label">Total Focus Time</p>
                      <p className="stat-value">{formatDuration((todayQuery.data?.completedWorkSessions ?? 0) * currentForm.workMinutes * 60)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Settings */}
              <div className="pomodoro-glass-card pomodoro-settings-card">
                <div className="card-header">
                  <h3>Configuration</h3>
                  <Settings size={24} className="icon-secondary" />
                </div>
                <form onSubmit={submitConfig} className="settings-form">
                  <div className="setting-row">
                    <div className="setting-label">
                      <label htmlFor="pomodoro-work-input">Work Session</label>
                      <span>{currentForm.workMinutes} min</span>
                    </div>
                    <input id="pomodoro-work-input" data-testid="pomodoro-work-input" type="range" min={5} max={60} value={currentForm.workMinutes} onChange={(e) => setForm({...currentForm, workMinutes: Number(e.target.value)})} />
                  </div>
                  <div className="setting-row">
                    <div className="setting-label">
                      <label htmlFor="pomodoro-short-break-input">Short Break</label>
                      <span>{currentForm.shortBreakMinutes} min</span>
                    </div>
                    <input id="pomodoro-short-break-input" data-testid="pomodoro-short-break-input" type="range" min={1} max={15} value={currentForm.shortBreakMinutes} onChange={(e) => setForm({...currentForm, shortBreakMinutes: Number(e.target.value)})} />
                  </div>
                  <div className="setting-row">
                    <div className="setting-label">
                      <label htmlFor="pomodoro-long-break-input">Long Break</label>
                      <span>{currentForm.longBreakMinutes} min</span>
                    </div>
                    <input id="pomodoro-long-break-input" data-testid="pomodoro-long-break-input" type="range" min={10} max={45} value={currentForm.longBreakMinutes} onChange={(e) => setForm({...currentForm, longBreakMinutes: Number(e.target.value)})} />
                  </div>
                  <div className="setting-row">
                    <div className="setting-label">
                      <label htmlFor="pomodoro-long-after-input">Long Break After</label>
                      <span>{currentForm.longBreakAfter} sessions</span>
                    </div>
                    <input id="pomodoro-long-after-input" data-testid="pomodoro-long-after-input" type="range" min={1} max={12} value={currentForm.longBreakAfter} onChange={(e) => setForm({...currentForm, longBreakAfter: Number(e.target.value)})} />
                  </div>
                  
                  <div className="settings-footer">
                    <button type="submit" className="save-btn" disabled={updateConfig.isPending || configQuery.isLoading}>
                      {updateConfig.isPending ? 'Saving...' : 'Save Settings'}
                    </button>
                    {message && <p className="save-message">{message}</p>}
                  </div>
                </form>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </AppShell>
  )
}
