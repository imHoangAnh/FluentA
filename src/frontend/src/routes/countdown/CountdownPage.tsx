import {
  Plus, Trash2, X,
  CalendarClock, Settings, Columns3, BookOpen, LogOut, NotebookPen, Repeat2, Kanban, Timer, Globe, HelpCircle, CheckSquare, ImagePlus
} from 'lucide-react'
import { type FormEvent, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation } from 'react-router-dom'
import { getUserAvatarUrl } from '../../lib/avatar'
import { LearningNavLinks } from '../../components/LearningNavLinks'
import * as assetsApi from '../../lib/api/assets.api'
import * as countdownApi from '../../lib/api/countdown.api'
import { useAuthStore } from '../../stores/authStore'
import './CountdownPage.css'

const alertDayOptions = ['OnTargetDay', '1DayBefore', '3DaysBefore', '7DaysBefore'] as const

function defaultTargetDate() {
  const date = new Date()
  date.setDate(date.getDate() + 7)
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`
}

function defaultAlert() {
  return { alertDay: '1DayBefore', alertTime: '09:00' }
}

function formatTargetDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}

function statusText(item: countdownApi.CountdownEvent) {
  if (item.isCompleted) {
    return 'Completed'
  }

  const diff = Math.ceil((new Date(`${item.targetDate}T00:00:00`).getTime() - new Date().getTime()) / 86_400_000)
  return diff <= 0 ? 'Today' : `${diff} day${diff === 1 ? '' : 's'} left`
}

export function CountdownPage() {
  const queryClient = useQueryClient()
  const location = useLocation()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const displayName = user?.fullName?.split(' ')[0] || 'User'
  const avatarUrl = getUserAvatarUrl(user, displayName)

  const [showFormModal, setShowFormModal] = useState(false)
  const [name, setName] = useState('')
  const [targetDate, setTargetDate] = useState(defaultTargetDate)
  const [alerts, setAlerts] = useState<Array<{ alertDay: string; alertTime: string }>>([defaultAlert()])
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const countdownsQuery = useQuery({
    queryKey: ['countdown', 'events'],
    queryFn: countdownApi.listCountdowns,
  })

  const countdowns = useMemo(() => countdownsQuery.data ?? [], [countdownsQuery.data])

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['countdown', 'events'] })
  }

  const resetForm = () => {
    setName('')
    setTargetDate(defaultTargetDate())
    setAlerts([defaultAlert()])
    setCoverFile(null)
    setFormError(null)
    setShowFormModal(false)
  }

  const createCountdown = useMutation({
    mutationFn: async () => {
      let coverAssetId: string | null = null
      if (coverFile) {
        const asset = await assetsApi.uploadCountdownCoverAsset(coverFile)
        coverAssetId = asset.id
      }

      return countdownApi.createCountdown({
        name,
        targetDate,
        alerts,
        coverAssetId,
      })
    },
    onSuccess: async () => {
      resetForm()
      await refresh()
    },
    onError: () => setFormError('Countdown could not be created.'),
  })

  const deleteCountdown = useMutation({
    mutationFn: countdownApi.deleteCountdown,
    onSuccess: async () => {
      await refresh()
    },
  })

  function submitCountdown(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) return
    createCountdown.mutate()
  }

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
          <Link to="/countdowns" className={location.pathname === '/countdowns' ? 'active' : ''}>
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
            <img className="dashboard-user-avatar" src={avatarUrl} alt="User" />
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

      <main className="dashboard-main countdown-main">
        <header className="countdown-header">
          <div className="countdown-header-title">
            <h2>Countdowns</h2>
            <p>Date-based milestones with fixed Vietnam-local alerts.</p>
          </div>
          <button className="add-event-btn" onClick={() => setShowFormModal(true)}>
            <Plus size={20} />
            <span>New Countdown</span>
          </button>
        </header>

        <div className="countdown-canvas">
          <section className="countdown-list-area">
            <div className="countdown-list-container">
              <div className="countdown-events-wrapper">
                {countdowns.map((item) => (
                  <article key={item.id} className="event-list-item active">
                    <div className="event-icon-box">
                      {item.coverUrl ? <img src={item.coverUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }} /> : <CalendarClock size={28} />}
                    </div>
                    <div className="event-info">
                      <h4 className="event-title">{item.name}</h4>
                      <p className="event-subtitle">{item.alerts.length} alert{item.alerts.length === 1 ? '' : 's'} · {formatTargetDate(item.targetDate)}</p>
                      <p className="event-subtitle">{item.alerts.map((alert) => `${alert.alertDay} ${alert.alertTime}`).join(' • ')}</p>
                    </div>
                    <div className="event-meta">
                      <p className={`event-days ${item.isCompleted ? 'event-days-completed' : ''}`}>{statusText(item)}</p>
                      <button
                        className="kanban-danger-btn"
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Delete "${item.name}"?`)) deleteCountdown.mutate(item.id)
                        }}
                      >
                        <Trash2 size={16} /> Delete
                      </button>
                    </div>
                  </article>
                ))}

                {!countdownsQuery.isLoading && countdowns.length === 0 ? (
                  <div className="empty-panel">
                    <CalendarClock size={32} />
                    <h3>No countdowns yet</h3>
                    <p>Create an exam, deadline, or milestone with one to five alerts.</p>
                  </div>
                ) : null}

                {countdownsQuery.isLoading ? <p className="flashcard-status">Loading countdowns...</p> : null}
                {countdownsQuery.isError ? <p className="flashcard-status flashcard-status--error">Could not load countdowns.</p> : null}
              </div>
            </div>
          </section>
        </div>

        {showFormModal ? (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3>Create Countdown</h3>
                <button onClick={resetForm}><X size={20} /></button>
              </div>
              <form onSubmit={submitCountdown}>
                <label>
                  Countdown name
                  <input required value={name} onChange={(event) => setName(event.target.value)} placeholder="E.g., JLPT N2 Exam" />
                </label>
                <label>
                  Target date
                  <input type="date" required value={targetDate} onChange={(event) => setTargetDate(event.target.value)} />
                </label>
                <label>
                  Cover image (optional)
                  <div className="color-picker-wrapper">
                    <ImagePlus size={18} />
                    <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setCoverFile(event.target.files?.[0] ?? null)} />
                  </div>
                </label>
                <div className="detail-notes">
                  <label>Alerts</label>
                  <div className="notes-box" style={{ display: 'grid', gap: '12px' }}>
                    {alerts.map((alert, index) => (
                      <div key={`${alert.alertDay}-${index}`} style={{ display: 'grid', gap: '8px' }}>
                        <select value={alert.alertDay} onChange={(event) => setAlerts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, alertDay: event.target.value } : item))}>
                          {alertDayOptions.map((option) => <option value={option} key={option}>{option}</option>)}
                        </select>
                        <input type="time" value={alert.alertTime} onChange={(event) => setAlerts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, alertTime: event.target.value } : item))} />
                        <button type="button" className="btn-cancel" onClick={() => setAlerts((current) => current.filter((_, itemIndex) => itemIndex !== index))} disabled={alerts.length === 1}>
                          Remove alert
                        </button>
                      </div>
                    ))}
                    <button type="button" className="add-event-btn" onClick={() => setAlerts((current) => current.length >= 5 ? current : [...current, defaultAlert()])}>
                      <Plus size={18} />
                      <span>Add alert</span>
                    </button>
                  </div>
                </div>
                {formError ? <p className="flashcard-status flashcard-status--error">{formError}</p> : null}
                <div className="modal-actions">
                  <button type="button" className="btn-cancel" onClick={resetForm}>Cancel</button>
                  <button type="submit" className="btn-submit" disabled={createCountdown.isPending}>Create Countdown</button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  )
}
