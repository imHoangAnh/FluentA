import { BarChart3, CheckCircle2, Clock3, Columns3, Loader2, Pause, Play, RotateCcw, Save, TimerReset } from 'lucide-react'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import * as pomodoroApi from '../../lib/api/pomodoro.api'
import * as todoApi from '../../lib/api/todo.api'
import * as kanbanApi from '../../lib/api/kanban.api'

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
      setMessage('Pomodoro settings saved.')
      await queryClient.invalidateQueries({ queryKey: ['pomodoro'] })
    },
    onError: () => setMessage('Could not save Pomodoro settings.'),
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
    onError: () => setMessage('Could not update Pomodoro timer.'),
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

  return (
    <main className="workspace pomodoro-workspace">
      <header className="workspace-header">
        <div className="brand-inline">
          <span className="brand-mark brand-mark--small">FA</span>
          <strong>FluentA</strong>
        </div>
        <nav className="workspace-nav" aria-label="Pomodoro navigation">
          <Link className="ghost-button ghost-button--inline" to="/">
            <BarChart3 size={17} /> Dashboard
          </Link>
          <Link className="ghost-button ghost-button--inline" to="/todo">
            <TimerReset size={17} /> Todo
          </Link>
          <Link className="ghost-button ghost-button--inline" to="/kanban">
            <Columns3 size={17} /> Kanban
          </Link>
        </nav>
      </header>

      <section className="pomodoro-shell">
        <div className="pomodoro-hero">
          <div>
            <span className="preview-label">Pomodoro</span>
            <h1>Focus timer</h1>
            <p>Configure your work and break rhythm before starting synced sessions.</p>
          </div>
          <Clock3 size={38} />
        </div>

        <section className="pomodoro-grid">
          <article className="pomodoro-timer-card">
            <span className="preview-label">Current state</span>
            <h2>{current?.state ?? 'Loading'}</h2>
            <strong data-testid="pomodoro-current-time">{current ? formatDuration(shownSeconds) : '--:--'}</strong>
            <p>{current ? `${current.phase} phase - ${formatDuration(current.durationSeconds)} configured` : 'Checking current timer state...'}</p>
            <p data-testid="pomodoro-today-count">Completed today: {todayQuery.data?.completedWorkSessions ?? 0}</p>
            {current?.state === 'Idle' ? (
              <label>
                Link task
                <select data-testid="pomodoro-task-select" value={linkedTask} onChange={(event) => setLinkedTask(event.target.value)}>
                  <option value="">No linked task</option>
                  {(todosQuery.data ?? []).map((todo) => <option key={todo.id} value={`todo:${todo.id}`}>Todo: {todo.title}</option>)}
                  {kanbanCards.map((card) => <option key={card.id} value={`kanban:${card.id}`}>Kanban: {card.boardName} / {card.title}</option>)}
                </select>
              </label>
            ) : current?.linkedTaskId ? <p data-testid="pomodoro-linked-task">Linked {current.linkedTaskSource} task</p> : null}
            <div className="pomodoro-controls">
              {current?.state === 'Idle' ? (
                <button className="primary-button" type="button" onClick={() => {
                  const [source, id] = linkedTask.split(':')
                  timerCommand.mutate({ command: 'start', startInput: id ? { linkedTaskId: id, linkedTaskSource: source as 'todo' | 'kanban' } : {} })
                }} disabled={timerCommand.isPending}>
                  <Play size={17} /> Start
                </button>
              ) : null}
              {current?.state === 'Running' ? (
                <button className="primary-button" type="button" onClick={() => timerCommand.mutate({ command: 'pause' })} disabled={timerCommand.isPending}>
                  <Pause size={17} /> Pause
                </button>
              ) : null}
              {current?.state === 'Paused' ? (
                <button className="primary-button" type="button" onClick={() => timerCommand.mutate({ command: 'resume' })} disabled={timerCommand.isPending}>
                  <Play size={17} /> Resume
                </button>
              ) : null}
              {current && current.state !== 'Idle' ? (
                <button className="ghost-button ghost-button--inline" type="button" onClick={() => timerCommand.mutate({ command: 'complete' })} disabled={timerCommand.isPending}>
                  <CheckCircle2 size={17} /> Complete phase
                </button>
              ) : null}
              <button className="ghost-button ghost-button--inline" type="button" onClick={() => timerCommand.mutate({ command: 'reset' })} disabled={timerCommand.isPending}>
                <RotateCcw size={17} /> Reset
              </button>
            </div>
          </article>

          <form className="pomodoro-config-form" onSubmit={submitConfig}>
            <h2>Timer settings</h2>
            <label>
              Work minutes
              <input
                data-testid="pomodoro-work-input"
                min={1}
                max={60}
                type="number"
                value={currentForm.workMinutes}
                onChange={(event) => setForm({ ...currentForm, workMinutes: Number(event.target.value) })}
              />
            </label>
            <label>
              Short break minutes
              <input
                data-testid="pomodoro-short-break-input"
                min={1}
                max={60}
                type="number"
                value={currentForm.shortBreakMinutes}
                onChange={(event) => setForm({ ...currentForm, shortBreakMinutes: Number(event.target.value) })}
              />
            </label>
            <label>
              Long break minutes
              <input
                data-testid="pomodoro-long-break-input"
                min={1}
                max={60}
                type="number"
                value={currentForm.longBreakMinutes}
                onChange={(event) => setForm({ ...currentForm, longBreakMinutes: Number(event.target.value) })}
              />
            </label>
            <label>
              Long break after
              <input
                data-testid="pomodoro-long-after-input"
                min={1}
                max={12}
                type="number"
                value={currentForm.longBreakAfter}
                onChange={(event) => setForm({ ...currentForm, longBreakAfter: Number(event.target.value) })}
              />
            </label>
            <button className="primary-button" type="submit" disabled={updateConfig.isPending || configQuery.isLoading}>
              {updateConfig.isPending ? <Loader2 size={18} /> : <Save size={18} />}
              Save settings
            </button>
            {message ? <p className={message.startsWith('Could') ? 'flashcard-status flashcard-status--error' : 'flashcard-status'}>{message}</p> : null}
            {configQuery.isError || currentQuery.isError ? <p className="flashcard-status flashcard-status--error">Could not load Pomodoro data.</p> : null}
          </form>
        </section>

        <section className="pomodoro-stopwatch" aria-label="Stopwatch">
          <span className="preview-label">Stopwatch</span>
          <h2>Free-form timer</h2>
          <strong data-testid="stopwatch-time">{formatDuration(stopwatchSeconds)}</strong>
          <div className="pomodoro-controls">
            <button className="primary-button" type="button" onClick={() => setStopwatchRunning((running) => !running)}>
              {stopwatchRunning ? <Pause size={17} /> : <Play size={17} />} {stopwatchRunning ? 'Pause stopwatch' : 'Start stopwatch'}
            </button>
            <button className="ghost-button ghost-button--inline" type="button" onClick={() => setLaps((values) => [...values, stopwatchSeconds])} disabled={!stopwatchSeconds}>
              Lap
            </button>
            <button className="ghost-button ghost-button--inline" type="button" onClick={() => { setStopwatchRunning(false); setStopwatchSeconds(0); setLaps([]) }}>
              <RotateCcw size={17} /> Reset stopwatch
            </button>
          </div>
          {laps.length ? <ol>{laps.map((lap, index) => <li key={`${index}-${lap}`}>Lap {index + 1}: {formatDuration(lap)}</li>)}</ol> : <p>No laps yet.</p>}
        </section>
      </section>
    </main>
  )
}
