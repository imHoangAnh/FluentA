import {
  Bell, BookOpen, CalendarClock, CheckSquare,
  Columns3, Flame, Globe, HelpCircle, LogOut, NotebookPen, Repeat2, Settings,
  Search, CheckCircle2, Circle, Kanban, Timer, TrendingUp
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation } from 'react-router-dom'
import { getUserAvatarUrl } from '../../lib/avatar'
import * as countdownApi from '../../lib/api/countdown.api'
import * as flashcardApi from '../../lib/api/flashcard.api'
import * as habitApi from '../../lib/api/habit.api'
import * as todoApi from '../../lib/api/todo.api'
import { LearningNavLinks } from '../../components/LearningNavLinks'
import { useAuthStore } from '../../stores/authStore'
import './DashboardPage.css'

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
  if (hour >= 5 && hour < 12) return `Good morning, ${name}! 👋`
  if (hour >= 12 && hour < 17) return `Good afternoon, ${name}! 👋`
  if (hour >= 17 && hour < 21) return `Good evening, ${name}! 👋`
  return `Burning midnight oil, ${name}? 🌙`
}

function remainingText(targetDate: string, now: Date) {
  const diff = new Date(targetDate).getTime() - now.getTime()
  if (diff <= 0) return 'Completed'
  const totalHours = Math.floor(diff / 3_600_000)
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24
  if (days > 0) return `${days} days ${hours}h`
  return `${hours} hours`
}

export function DashboardPage() {
  const queryClient = useQueryClient()
  const logout = useAuthStore((state) => state.logout)
  const user = useAuthStore((state) => state.user)
  const location = useLocation()
  const [now, setNow] = useState(() => new Date())
  
  const today = useMemo(() => toDateInput(new Date()), [])
  const timeZoneId = useMemo(() => browserTimeZone(), [])
  const displayName = user?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'Learner'
  const avatarUrl = getUserAvatarUrl(user, displayName)

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 1000)
    void preloadJournalEditor()
    return () => window.clearInterval(intervalId)
  }, [])

  const todosQuery = useQuery({ queryKey: ['todo', 'items', today], queryFn: () => todoApi.listByDate(today) })
  const habitsQuery = useQuery({ queryKey: ['habit', 'list', timeZoneId], queryFn: () => habitApi.listHabits(timeZoneId) })
  const countdownsQuery = useQuery({ queryKey: ['countdown', 'events'], queryFn: countdownApi.listCountdowns })
  const flashcardDashboardQuery = useQuery({ queryKey: ['review', 'dashboard'], queryFn: () => flashcardApi.getDashboard(timeZoneId) })
  const todoToggle = useMutation({
    mutationFn: (todo: todoApi.TodoItem) => todoApi.updateTodo(todo.id, { isCompleted: !todo.isCompleted }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['todo'] })
    },
  })

  const todos = useMemo(
    () => (todosQuery.data ?? []).toSorted((left, right) =>
      Number(left.isCompleted) - Number(right.isCompleted)
      || (left.completedAt ?? left.createdAt).localeCompare(right.completedAt ?? right.createdAt),
    ),
    [todosQuery.data],
  )
  const visibleTodos = todos.slice(0, 3)

  const habits = useMemo(() => (habitsQuery.data ?? []).filter((habit) => habit.isScheduledToday).slice(0, 2), [habitsQuery.data])

  const countdowns = useMemo(() => (countdownsQuery.data ?? []).toSorted((left, right) => new Date(left.targetDate).getTime() - new Date(right.targetDate).getTime()).slice(0, 1), [countdownsQuery.data])

  const flashcardDashboard = flashcardDashboardQuery.data
  const dueCards = (flashcardDashboard?.overdue ?? 0) + (flashcardDashboard?.dueToday ?? 0) + (flashcardDashboard?.newCards ?? 0)
  const totalCards = dueCards > 0 ? dueCards + 20 : 100 // Mock total for ring
  const ringPercentage = dueCards > 0 ? (dueCards / totalCards) * 251.2 : 0

  return (
    <div className="dashboard-layout">
      {/* SideNavBar */}
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
          <Link to="/countdowns" className={location.pathname === '/countdowns' ? 'active' : ''}>
            <CalendarClock size={20} /> Countdowns
          </Link>
          <Link to="/journal" className={location.pathname === '/journal' ? 'active' : ''} onMouseEnter={preloadJournalEditor}>
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
              <p className="dashboard-user-level">Learner Profile</p>
            </div>
          </div>
          <div className="dashboard-user-links">
            <Link to="/settings"><Settings size={16} /> Settings</Link>
            <Link to="#"><HelpCircle size={16} /> Help</Link>
            <Link to="#" onClick={(e) => { e.preventDefault(); void logout() }}><LogOut size={16} /> Logout</Link>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="dashboard-main">
        {/* TopAppBar */}
        <header className="dashboard-header">
          <div className="dashboard-search">
            <Search size={20} color="#6d7a77" />
            <input type="text" placeholder="Search vocabulary..." />
          </div>
          <div className="dashboard-header-actions">
            <button className="dashboard-notification-btn">
              <Bell size={24} />
              <span className="dashboard-notification-dot"></span>
            </button>
          </div>
        </header>

        {/* Dashboard Canvas */}
        <div className="dashboard-content">
          {/* Welcome Header */}
          <section className="dashboard-welcome">
            <div className="dashboard-welcome-text">
              <h2>{greeting(now.getHours(), displayName)}</h2>
              <p>Today is <span>{new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(now)}</span></p>
            </div>
            
            <div className="dashboard-streak-card">
              <div className="dashboard-streak-icon">
                <Flame size={28} />
              </div>
              <div className="dashboard-streak-info">
                <p className="dashboard-streak-label">Current Streak</p>
                <p className="dashboard-streak-value">{flashcardDashboard?.streakDays ?? 0} Days</p>
              </div>
            </div>
          </section>

          {/* Bento Grid Section */}
          <div className="dashboard-bento-grid">
            {/* Review Queue Card */}
            <div className="bento-card card-col-8">
              <div className="bento-card-header">
                <h3 className="bento-card-title">Review Queue</h3>
              </div>
              <div className="review-queue-content">
                <div className="review-chart-container">
                  <div className="review-chart">
                    <svg viewBox="0 0 100 100">
                      <circle cx="50" cy="50" fill="transparent" r="40" stroke="#eceef0" strokeWidth="10"></circle>
                      <circle cx="50" cy="50" fill="transparent" r="40" stroke="#0D9488" strokeDasharray="251.2" strokeDashoffset={251.2 - ringPercentage} strokeLinecap="round" strokeWidth="10"></circle>
                      <circle cx="50" cy="50" fill="transparent" r="40" stroke="#6bd8cb" strokeDasharray="251.2" strokeDashoffset={251.2 - (ringPercentage * 0.4)} strokeLinecap="round" strokeWidth="10"></circle>
                    </svg>
                    <div className="review-chart-center">
                      <span className="count">{dueCards}</span>
                      <span className="label">DUE TODAY</span>
                    </div>
                  </div>
                </div>
                <div className="review-stats">
                  <div className="review-stat-row">
                    <div className="review-stat-label"><div className="review-stat-dot bg-teal"></div> Review</div>
                    <strong>{(flashcardDashboard?.overdue ?? 0) + (flashcardDashboard?.dueToday ?? 0)}</strong>
                  </div>
                  <div className="review-stat-row">
                    <div className="review-stat-label"><div className="review-stat-dot bg-light-teal"></div> Learning</div>
                    <strong>{flashcardDashboard?.newCards ?? 0}</strong>
                  </div>
                </div>
                <Link to="/review" style={{textDecoration: 'none'}}>
                  <button className="btn-primary">Open Review</button>
                </Link>
              </div>
            </div>

            {/* Daily To-Do */}
            <div className="bento-card card-col-4">
              <div className="bento-card-header">
                <h3 className="bento-card-subtitle">Daily To-Do</h3>
                <CheckSquare size={20} color="#0D9488" />
              </div>
              <ul className="todo-list">
                {todos.length === 0 ? <p style={{fontSize: 14}}>No tasks for today.</p> : null}
                {visibleTodos.map(todo => (
                  <li key={todo.id} className={`todo-item ${todo.isCompleted ? 'completed' : ''}`} onClick={() => todoToggle.mutate(todo)}>
                    {todo.isCompleted ? <CheckCircle2 size={18} color="#0D9488" /> : <Circle size={18} color="#6d7a77" />}
                    <span>{todo.title}</span>
                  </li>
                ))}
              </ul>
              <Link to="/todo" style={{textDecoration: 'none', marginTop: 'auto'}}>
                 <button className="btn-outline" style={{ border: 'none', color: '#0D9488', width: 'auto', padding: 0 }}>View all tasks →</button>
              </Link>
            </div>

            {/* Next Event */}
            <div className="bento-card card-col-6">
              <div className="bento-card-header">
                <h3 className="bento-card-subtitle">Next Event</h3>
                <Timer size={20} color="#0D9488" />
              </div>
              {countdowns.length > 0 ? (
                <div className="next-event-content">
                  <p className="next-event-time">{remainingText(countdowns[0].targetDate, now)}</p>
                  <p className="next-event-label">{countdowns[0].name}</p>
                </div>
              ) : (
                <div className="next-event-content">
                  <p className="next-event-time">--:--</p>
                  <p className="next-event-label">No upcoming events</p>
                </div>
              )}
              <Link to="/countdowns" style={{textDecoration: 'none', marginTop: 'auto'}}>
                <button className="btn-outline">Open Countdowns</button>
              </Link>
            </div>

            {/* Habit Tracker */}
            <div className="bento-card card-col-6">
              <div className="bento-card-header">
                <h3 className="bento-card-subtitle">Habit Tracker</h3>
                <TrendingUp size={20} color="#0D9488" />
              </div>
              <div className="habit-list">
                {habits.length === 0 ? <p style={{fontSize: 14}}>No habits scheduled today.</p> : null}
                {habits.map(habit => (
                  <div className="habit-item" key={habit.id}>
                    <div className="habit-item-header">
                      <span>STREAK: {habit.currentStreak} DAYS</span>
                      <span>{habit.isCheckedToday ? '100%' : '0%'}</span>
                    </div>
                    <div className="habit-progress-bar">
                      <div className="habit-progress-fill" style={{ width: habit.isCheckedToday ? '100%' : '0%' }}></div>
                    </div>
                    <p className="habit-item-label">{habit.name}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Continue Learning Section */}
          <section style={{marginTop: '16px'}}>
            <div className="continue-learning-header" style={{marginBottom: '24px'}}>
              <h3>Continue Learning</h3>
              <Link to="/vocabulary">View All</Link>
            </div>
            
            <div className="word-grid">
              <div className="word-card">
                <div className="word-card-header">
                  <span className="word-type">Noun</span>
                </div>
                <h4>perro</h4>
                <p className="word-example">"El perro corre en el parque."</p>
                <div className="word-translation">
                  <p>English: Dog</p>
                </div>
              </div>
              
              <div className="word-card">
                <div className="word-card-header">
                  <span className="word-type">Noun</span>
                </div>
                <h4>casa</h4>
                <p className="word-example">"Mi casa es su casa."</p>
                <div className="word-translation">
                  <p>English: House</p>
                </div>
              </div>

              <div className="word-card">
                <div className="word-card-header">
                  <span className="word-type">Noun</span>
                </div>
                <h4>agua</h4>
                <p className="word-example">"Bebe un poco de agua."</p>
                <div className="word-translation">
                  <p>English: Water</p>
                </div>
              </div>

              <Link to="/vocabulary" style={{textDecoration: 'none'}}>
                <div className="add-word-card">
                  <BookOpen size={36} color="#6d7a77" style={{marginBottom: 8}} />
                  <p style={{color: '#191c1e'}}>Add New Words</p>
                </div>
              </Link>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
