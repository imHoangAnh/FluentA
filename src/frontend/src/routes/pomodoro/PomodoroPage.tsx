import {
  CheckCircle2, Clock3, Columns3, Pause, Play, RotateCcw, TimerReset,
  BookOpen, CalendarClock, CheckSquare, Globe, HelpCircle,
  LogOut, NotebookPen, Repeat2, Settings, Kanban, Timer, Bell
} from 'lucide-react'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation } from 'react-router-dom'
import { getUserAvatarUrl } from '../../lib/avatar'
import { LearningNavLinks } from '../../components/LearningNavLinks'
import * as pomodoroApi from '../../lib/api/pomodoro.api'
import * as todoApi from '../../lib/api/todo.api'
import * as kanbanApi from '../../lib/api/kanban.api'
import { useAuthStore } from '../../stores/authStore'
import './PomodoroPage.css'

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
  const location = useLocation()
  const [form, setForm] = useState<ConfigForm | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [displaySeconds, setDisplaySeconds] = useState<number | null>(null)
  const [linkedTask, setLinkedTask] = useState('')
  const [stopwatchSeconds, setStopwatchSeconds] = useState(0)
  const [stopwatchRunning, setStopwatchRunning] = useState(false)
  const [laps, setLaps] = useState<number[]>([])
  const autoCompletedKey = useRef<string | null>(null)

  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const displayName = user?.fullName?.split(' ')[0] || 'User'
  const avatarUrl = getUserAvatarUrl(user, displayName)

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
    <div className="dashboard-container">
      <aside className="dashboard-sidebar">
        <div className="dashboard-brand">
          <div className="dashboard-brand-icon">
            <Globe size={24} />
          </div>
          <div className="dashboard-brand-text">
            <h1>FluentA</h1>
            <p>Language Learning</p>
          </div>
        </div>

        <nav className="dashboard-nav">
          <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
            <Columns3 size={20} /> Today
          </Link>
          <Link to="/vocabulary" className={location.pathname === '/vocabulary' ? 'active' : ''}>
            <BookOpen size={20} /> Vocabulary
          </Link>
          <LearningNavLinks />
          <Link to="/todo" className={location.pathname === '/todo' ? 'active' : ''}>
            <CheckSquare size={20} /> Todo
          </Link>
          <Link to="/habits" className={location.pathname === '/habits' ? 'active' : ''}>
            <Repeat2 size={20} /> Habits
          </Link>
          <Link to="/countdown" className={location.pathname === '/countdown' ? 'active' : ''}>
            <CalendarClock size={20} /> Countdowns
          </Link>
          <Link to="/journal" className={location.pathname === '/journal' ? 'active' : ''}>
            <NotebookPen size={20} /> Journal
          </Link>
          <Link to="/kanban" className={location.pathname === '/kanban' ? 'active' : ''}>
            <Kanban size={20} /> Kanban
          </Link>
          <Link to="/pomodoro" className={location.pathname === '/pomodoro' ? 'active' : ''}>
            <Timer size={20} /> Pomodoro
          </Link>
        </nav>

        <div className="dashboard-user-section">
          <div className="dashboard-user-card">
            <img 
              className="dashboard-user-avatar" 
              src={avatarUrl}
              alt="User" 
            />
            <div className="dashboard-user-info">
              <p className="dashboard-user-name">{user?.fullName || displayName}</p>
              <p className="dashboard-user-level">Premium User</p>
            </div>
          </div>
          <div className="dashboard-user-links">
            <Link to="/settings"><Settings size={16} /> Settings</Link>
            <Link to="#"><HelpCircle size={16} /> Help</Link>
            <Link to="#" onClick={(e) => { e.preventDefault(); void logout() }}><LogOut size={16} /> Logout</Link>
          </div>
        </div>
      </aside>

      <main className="dashboard-main pomodoro-main">
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
                    <span className="timer-display">{current ? formatDuration(shownSeconds) : '--:--'}</span>
                    <span className="timer-label">remaining</span>
                  </div>
                </div>

                {/* Controls */}
                <div className="pomodoro-controls">
                  <button className="control-btn secondary" onClick={() => timerCommand.mutate({ command: 'reset' })} disabled={timerCommand.isPending}>
                    <RotateCcw size={24} />
                  </button>
                  
                  {current?.state === 'Idle' ? (
                    <button className="control-btn primary" onClick={() => {
                      const [source, id] = linkedTask.split(':')
                      timerCommand.mutate({ command: 'start', startInput: id ? { linkedTaskId: id, linkedTaskSource: source as 'todo' | 'kanban' } : {} })
                    }} disabled={timerCommand.isPending}>
                      <Play size={40} fill="currentColor" />
                    </button>
                  ) : current?.state === 'Running' ? (
                    <button className="control-btn primary" onClick={() => timerCommand.mutate({ command: 'pause' })} disabled={timerCommand.isPending}>
                      <Pause size={40} fill="currentColor" />
                    </button>
                  ) : current?.state === 'Paused' ? (
                    <button className="control-btn primary" onClick={() => timerCommand.mutate({ command: 'resume' })} disabled={timerCommand.isPending}>
                      <Play size={40} fill="currentColor" />
                    </button>
                  ) : (
                    <button className="control-btn primary" onClick={() => timerCommand.mutate({ command: 'reset' })} disabled={timerCommand.isPending}>
                      <RotateCcw size={40} />
                    </button>
                  )}

                  <button className="control-btn secondary" onClick={() => timerCommand.mutate({ command: 'complete' })} disabled={timerCommand.isPending}>
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
                    <select value={linkedTask} onChange={(event) => setLinkedTask(event.target.value)} disabled={current?.state !== 'Idle'}>
                      <option value="">No linked task</option>
                      {(todosQuery.data ?? []).map((todo) => <option key={todo.id} value={`todo:${todo.id}`}>Todo: {todo.title}</option>)}
                      {kanbanCards.map((card) => <option key={card.id} value={`kanban:${card.id}`}>Kanban: {card.boardName} / {card.title}</option>)}
                    </select>
                  </div>
                  {current?.linkedTaskId && current?.state !== 'Idle' && <p className="linked-status">Task actively linked.</p>}
                </div>

                {/* Stopwatch Section */}
                <div className="pomodoro-glass-card pomodoro-stopwatch-card">
                  <div className="card-header">
                    <h3>Stopwatch</h3>
                    <TimerReset size={24} className="icon-primary" />
                  </div>
                  <div className="stopwatch-row">
                    <div className="stopwatch-time">{formatDuration(stopwatchSeconds)}</div>
                    <button className="btn-stopwatch" onClick={() => setStopwatchRunning((r) => !r)}>
                      {stopwatchRunning ? 'Pause' : 'Start Freeform'}
                    </button>
                  </div>
                  {stopwatchSeconds > 0 && (
                     <div className="stopwatch-actions">
                        <button className="btn-lap" onClick={() => setLaps((v) => [...v, stopwatchSeconds])}>Lap</button>
                        <button className="btn-reset" onClick={() => { setStopwatchRunning(false); setStopwatchSeconds(0); setLaps([]) }}>Reset</button>
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
                  <div className="stat-item">
                    <div className="stat-icon-wrapper">
                      <CheckCircle2 size={24} />
                    </div>
                    <div className="stat-info">
                      <p className="stat-label">Sessions Today</p>
                      <p className="stat-value">{todayQuery.data?.completedWorkSessions ?? 0}</p>
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
                      <label>Work Session</label>
                      <span>{currentForm.workMinutes} min</span>
                    </div>
                    <input type="range" min={5} max={60} value={currentForm.workMinutes} onChange={(e) => setForm({...currentForm, workMinutes: Number(e.target.value)})} />
                  </div>
                  <div className="setting-row">
                    <div className="setting-label">
                      <label>Short Break</label>
                      <span>{currentForm.shortBreakMinutes} min</span>
                    </div>
                    <input type="range" min={1} max={15} value={currentForm.shortBreakMinutes} onChange={(e) => setForm({...currentForm, shortBreakMinutes: Number(e.target.value)})} />
                  </div>
                  <div className="setting-row">
                    <div className="setting-label">
                      <label>Long Break</label>
                      <span>{currentForm.longBreakMinutes} min</span>
                    </div>
                    <input type="range" min={10} max={45} value={currentForm.longBreakMinutes} onChange={(e) => setForm({...currentForm, longBreakMinutes: Number(e.target.value)})} />
                  </div>
                  <div className="setting-row">
                    <div className="setting-label">
                      <label>Long Break After</label>
                      <span>{currentForm.longBreakAfter} sessions</span>
                    </div>
                    <input type="range" min={1} max={12} value={currentForm.longBreakAfter} onChange={(e) => setForm({...currentForm, longBreakAfter: Number(e.target.value)})} />
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
    </div>
  )
}
