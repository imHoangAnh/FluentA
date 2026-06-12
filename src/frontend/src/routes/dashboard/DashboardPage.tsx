import { BarChart3, BookOpen, CalendarClock, CheckSquare, Clock3, Columns3, Flame, Layers, LogOut, NotebookPen, Repeat2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import * as countdownApi from '../../lib/api/countdown.api'
import * as flashcardApi from '../../lib/api/flashcard.api'
import * as habitApi from '../../lib/api/habit.api'
import * as todoApi from '../../lib/api/todo.api'
import { useAuthStore } from '../../stores/authStore'

const preloadJournalEditor = () => import('../journal/JournalRichTextEditor')

function browserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

function toDateInput(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function greeting(hour: number, name: string) {
  if (hour >= 5 && hour < 12) return `Good morning, ${name}!`
  if (hour >= 12 && hour < 17) return `Good afternoon, ${name}!`
  if (hour >= 17 && hour < 21) return `Good evening, ${name}!`
  return `Burning midnight oil, ${name}?`
}

function streakMessage(days: number) {
  if (days >= 30) return "You're on fire!"
  if (days >= 7) return 'Great streak!'
  return 'Keep going!'
}

function remainingText(targetDate: string, now: Date) {
  const diff = new Date(targetDate).getTime() - now.getTime()
  if (diff <= 0) return 'Completed'

  const totalHours = Math.floor(diff / 3_600_000)
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24
  return `${days} days ${hours} hours`
}

export function DashboardPage() {
  const queryClient = useQueryClient()
  const logout = useAuthStore((state) => state.logout)
  const user = useAuthStore((state) => state.user)
  const [now, setNow] = useState(() => new Date())
  const today = useMemo(() => toDateInput(new Date()), [])
  const timeZoneId = useMemo(() => browserTimeZone(), [])
  const displayName = user?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'learner'

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 1000)
    void preloadJournalEditor()
    return () => window.clearInterval(intervalId)
  }, [])

  const todosQuery = useQuery({
    queryKey: ['todo', 'items', today],
    queryFn: () => todoApi.listByDate(today),
  })

  const habitsQuery = useQuery({
    queryKey: ['habit', 'list', timeZoneId],
    queryFn: () => habitApi.listHabits(timeZoneId),
  })

  const countdownsQuery = useQuery({
    queryKey: ['countdown', 'events'],
    queryFn: countdownApi.listCountdowns,
  })

  const flashcardDashboardQuery = useQuery({
    queryKey: ['flashcard', 'dashboard'],
    queryFn: () => flashcardApi.getDashboard(timeZoneId),
  })

  const decksQuery = useQuery({
    queryKey: ['flashcard', 'decks'],
    queryFn: flashcardApi.listDecks,
  })

  const todoToggle = useMutation({
    mutationFn: (todo: todoApi.TodoItem) => todoApi.updateTodo(todo.id, { isCompleted: !todo.isCompleted }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['todo'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const habitToggle = useMutation({
    mutationFn: (habit: habitApi.Habit) => habitApi.toggleHabitEntry(habit.id, today, timeZoneId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['habit'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const todos = useMemo(
    () => (todosQuery.data ?? []).toSorted((left, right) => Number(left.isCompleted) - Number(right.isCompleted) || left.sortOrder - right.sortOrder),
    [todosQuery.data],
  )
  const visibleTodos = todos.slice(0, 6)
  const remainingTodos = todos.filter((todo) => !todo.isCompleted).length
  const extraTodos = Math.max(0, todos.length - visibleTodos.length)

  const habits = useMemo(
    () => (habitsQuery.data ?? []).filter((habit) => habit.isScheduledToday).slice(0, 6),
    [habitsQuery.data],
  )

  const countdowns = useMemo(
    () => (countdownsQuery.data ?? [])
      .toSorted((left, right) => new Date(left.targetDate).getTime() - new Date(right.targetDate).getTime())
      .slice(0, 3),
    [countdownsQuery.data],
  )

  const allWordsDeck = useMemo(
    () => (decksQuery.data ?? []).find((deck) => deck.type === 'AllWords' && deck.cards.length > 0),
    [decksQuery.data],
  )
  const flashcardDashboard = flashcardDashboardQuery.data
  const dueCards = (flashcardDashboard?.overdue ?? 0) + (flashcardDashboard?.dueToday ?? 0) + (flashcardDashboard?.newCards ?? 0)

  return (
    <main className="workspace dashboard-workspace">
      <header className="workspace-header">
        <div className="brand-inline">
          <span className="brand-mark brand-mark--small">FA</span>
          <strong>FluentA</strong>
        </div>
        <nav className="workspace-nav" aria-label="Dashboard navigation">
          <Link className="ghost-button ghost-button--inline" to="/vocabulary" data-testid="open-vocabulary">
            <BookOpen size={17} /> Vocabulary
          </Link>
          <Link className="ghost-button ghost-button--inline" to="/flashcards" data-testid="open-flashcards">
            <Layers size={17} /> Flashcards
          </Link>
          <Link className="ghost-button ghost-button--inline" to="/todo" data-testid="open-todo">
            <CheckSquare size={17} /> Todo
          </Link>
          <Link className="ghost-button ghost-button--inline" to="/habits" data-testid="open-habits">
            <Repeat2 size={17} /> Habits
          </Link>
          <Link className="ghost-button ghost-button--inline" to="/countdown" data-testid="open-countdown">
            <CalendarClock size={17} /> Countdown
          </Link>
          <Link
            className="ghost-button ghost-button--inline"
            to="/journal"
            data-testid="open-journal"
            onFocus={preloadJournalEditor}
            onMouseEnter={preloadJournalEditor}
          >
            <NotebookPen size={17} /> Journal
          </Link>
          <Link className="ghost-button ghost-button--inline" to="/kanban" data-testid="open-kanban">
            <Columns3 size={17} /> Kanban
          </Link>
          <Link className="ghost-button ghost-button--inline" to="/pomodoro" data-testid="open-pomodoro">
            <Clock3 size={17} /> Pomodoro
          </Link>
          <button className="icon-button" type="button" onClick={() => void logout()} aria-label="Logout">
            <LogOut size={18} />
          </button>
        </nav>
      </header>

      <section className="dashboard-shell">
        <div className="dashboard-hero">
          <div>
            <span className="preview-label">Dashboard Overview</span>
            <h1>{greeting(now.getHours(), displayName)}</h1>
            <p>{new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(now)}</p>
          </div>
          <BarChart3 size={38} />
        </div>

        <section className="dashboard-grid" aria-label="Dashboard widgets">
          <article className="dashboard-card dashboard-card--flashcards">
            <header>
              <Layers size={20} />
              <div>
                <span>Flashcards</span>
                <h2>{dueCards > 0 ? `${dueCards} cards due` : 'No cards due today'}</h2>
              </div>
            </header>
            <p>{dueCards > 0 ? `${flashcardDashboard?.overdue ?? 0} overdue | ${flashcardDashboard?.dueToday ?? 0} due | ${flashcardDashboard?.newCards ?? 0} new` : 'Great work. Your review queue is clear.'}</p>
            {allWordsDeck ? (
              <Link className="primary-button" to={`/flashcards/decks/${allWordsDeck.id}/review`}>
                Review Now
              </Link>
            ) : (
              <Link className="primary-button" to="/flashcards">
                Open Flashcards
              </Link>
            )}
          </article>

          <article className="dashboard-card dashboard-card--streak" data-testid="dashboard-overview-streak">
            <header>
              <Flame size={20} />
              <div>
                <span>Streak</span>
                <h2>{flashcardDashboard?.streakDays ?? 0} days</h2>
              </div>
            </header>
            <p>{streakMessage(flashcardDashboard?.streakDays ?? 0)}</p>
          </article>

          <article className="dashboard-card">
            <header>
              <CheckSquare size={20} />
              <div>
                <span>Todo Today</span>
                <h2>{remainingTodos} remaining</h2>
              </div>
            </header>
            <div className="dashboard-list">
              {visibleTodos.length === 0 ? <p>No tasks for today.</p> : null}
              {visibleTodos.map((todo) => (
                <label className="dashboard-check-row" key={todo.id}>
                  <input
                    aria-label={`${todo.isCompleted ? 'Uncheck' : 'Check'} todo ${todo.title}`}
                    checked={todo.isCompleted}
                    disabled={todoToggle.isPending}
                    type="checkbox"
                    onChange={() => todoToggle.mutate(todo)}
                  />
                  <span>{todo.title}</span>
                </label>
              ))}
            </div>
            <footer>
              {extraTodos > 0 ? <small>{extraTodos} more tasks...</small> : <small>Today is in view.</small>}
              <Link to="/todo">View All -&gt;</Link>
            </footer>
          </article>

          <article className="dashboard-card">
            <header>
              <Repeat2 size={20} />
              <div>
                <span>Habit Today</span>
                <h2>{habits.length} scheduled</h2>
              </div>
            </header>
            <div className="dashboard-list">
              {habits.length === 0 ? <p>No habits scheduled today.</p> : null}
              {habits.map((habit) => (
                <label className="dashboard-check-row" key={habit.id}>
                  <input
                    aria-label={`${habit.isCheckedToday ? 'Uncheck' : 'Check'} habit ${habit.name}`}
                    checked={habit.isCheckedToday}
                    disabled={habitToggle.isPending}
                    type="checkbox"
                    onChange={() => habitToggle.mutate(habit)}
                  />
                  <span>{habit.name}</span>
                  <small>{habit.currentStreak} day streak</small>
                </label>
              ))}
            </div>
            <footer>
              <small>Scheduled days only.</small>
              <Link to="/habits">Open Habits -&gt;</Link>
            </footer>
          </article>

          <article className="dashboard-card dashboard-card--wide">
            <header>
              <CalendarClock size={20} />
              <div>
                <span>Countdown</span>
                <h2>{countdowns.length > 0 ? 'Upcoming dates' : 'No countdowns yet'}</h2>
              </div>
            </header>
            <div className="dashboard-countdowns">
              {countdowns.length === 0 ? <p>Create your first countdown to see it here.</p> : null}
              {countdowns.map((countdown) => (
                <div key={countdown.id}>
                  <strong>{countdown.icon ? `${countdown.icon} ` : ''}{countdown.name}</strong>
                  <span>{countdown.isCompleted ? 'Completed' : remainingText(countdown.targetDate, now)}</span>
                </div>
              ))}
            </div>
            <footer>
              <small>Nearest three events.</small>
              <Link to="/countdown">Open Countdown -&gt;</Link>
            </footer>
          </article>
        </section>

        {todosQuery.isError || habitsQuery.isError || countdownsQuery.isError || flashcardDashboardQuery.isError || decksQuery.isError ? (
          <p className="flashcard-status flashcard-status--error">Some dashboard data could not be loaded.</p>
        ) : null}
      </section>
    </main>
  )
}
