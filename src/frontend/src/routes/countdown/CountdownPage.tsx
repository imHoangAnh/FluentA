import { 
  Plus, Edit3, Trash2, X,
  CalendarClock, Settings, Columns3, BookOpen, Layers, LogOut, NotebookPen, Repeat2, Kanban, Timer, Globe, HelpCircle, FileText, GraduationCap, ClipboardList, CheckSquare, MapPin
} from 'lucide-react'
import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation } from 'react-router-dom'
import * as countdownApi from '../../lib/api/countdown.api'
import { useAuthStore } from '../../stores/authStore'
import './CountdownPage.css'

function toLocalInput(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hours = `${date.getHours()}`.padStart(2, '0')
  const minutes = `${date.getMinutes()}`.padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function defaultTargetDate() {
  const date = new Date()
  date.setDate(date.getDate() + 7)
  date.setHours(9, 0, 0, 0)
  return toLocalInput(date)
}

function toUtcIso(localValue: string) {
  return new Date(localValue).toISOString()
}

function formatTargetDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: '2-digit',
    year: 'numeric'
  }).format(new Date(value))
}

export function CountdownPage() {
  const queryClient = useQueryClient()
  const location = useLocation()
  const [now, setNow] = useState(() => new Date())
  
  // Modal / Sidebar state
  const [showDetailSidebar, setShowDetailSidebar] = useState(false)
  const [showFormModal, setShowFormModal] = useState(false)
  
  // Selection
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [targetDate, setTargetDate] = useState(defaultTargetDate)
  const [color, setColor] = useState('#0D9488') // Teal default
  const [icon, setIcon] = useState('ClipboardList') // Default icon string

  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const displayName = user?.fullName?.split(' ')[0] || 'User'

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const countdownsQuery = useQuery({
    queryKey: ['countdown', 'events'],
    queryFn: countdownApi.listCountdowns,
  })

  const countdowns = useMemo(
    () => (countdownsQuery.data ?? []).toSorted((left, right) => new Date(left.targetDate).getTime() - new Date(right.targetDate).getTime()),
    [countdownsQuery.data],
  )

  const selectedEvent = countdowns.find(c => c.id === selectedEventId) || countdowns[0]

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['countdown', 'events'] })
  }

  const resetForm = () => {
    setEditingId(null)
    setName('')
    setTargetDate(defaultTargetDate())
    setColor('#0D9488')
    setIcon('ClipboardList')
    setShowFormModal(false)
  }

  const createCountdown = useMutation({
    mutationFn: countdownApi.createCountdown,
    onSuccess: async () => {
      resetForm()
      await refresh()
    },
  })

  const updateCountdown = useMutation({
    mutationFn: (input: { id: string; patch: countdownApi.UpdateCountdownInput }) => countdownApi.updateCountdown(input.id, input.patch),
    onSuccess: async () => {
      resetForm()
      await refresh()
    },
  })

  const deleteCountdown = useMutation({
    mutationFn: countdownApi.deleteCountdown,
    onSuccess: async () => {
      await refresh()
      setShowDetailSidebar(false)
    },
  })

  function submitCountdown(event: FormEvent) {
    event.preventDefault()
    if (!name.trim() || !targetDate) return

    const payload = {
      name,
      targetDate: toUtcIso(targetDate),
      color: color.trim() ? color : null,
      icon: icon.trim() ? icon : null,
    }

    if (editingId) {
      updateCountdown.mutate({ id: editingId, patch: payload })
    } else {
      createCountdown.mutate(payload)
    }
  }

  function editCountdown(item: countdownApi.CountdownEvent) {
    setEditingId(item.id)
    setName(item.name)
    setTargetDate(toLocalInput(new Date(item.targetDate)))
    setColor(item.color ?? '#0D9488')
    setIcon(item.icon ?? 'ClipboardList')
    setShowFormModal(true)
  }

  function confirmDelete(item: countdownApi.CountdownEvent) {
    if (window.confirm(`Delete "${item.name}"?`)) {
      deleteCountdown.mutate(item.id)
    }
  }

  const IconMap: Record<string, React.ReactNode> = {
    'ClipboardList': <ClipboardList size={28} />,
    'FileText': <FileText size={28} />,
    'GraduationCap': <GraduationCap size={28} />
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
          <Link to="/flashcards" className={location.pathname.startsWith('/flashcards') ? 'active' : ''}>
            <Layers size={20} /> Review
          </Link>
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
              src={`https://ui-avatars.com/api/?name=${displayName}&background=0D9488&color=fff`} 
              alt="User" 
            />
            <div className="dashboard-user-info">
              <p className="dashboard-user-name">{user?.fullName || displayName}</p>
              <p className="dashboard-user-level">Premium User</p>
            </div>
          </div>
          <div className="dashboard-user-links">
            <Link to="/settings/review"><Settings size={16} /> Settings</Link>
            <Link to="#"><HelpCircle size={16} /> Help</Link>
            <Link to="#" onClick={(e) => { e.preventDefault(); void logout() }}><LogOut size={16} /> Logout</Link>
          </div>
        </div>
      </aside>

      <main className="dashboard-main countdown-main">
        <header className="countdown-header">
          <div className="countdown-header-title">
            <h2>Countdowns</h2>
          </div>
        </header>

        <div className="countdown-canvas">
          {/* Main List Area */}
          <section className="countdown-list-area">
            <div className="countdown-list-container">
              
              {/* Page Header */}
              <div className="countdown-page-header">
                <div>
                  <h2 className="countdown-page-title">Important Dates</h2>
                  <p className="countdown-page-subtitle">{countdowns.length} tracked events</p>
                </div>
                <button 
                  className="add-event-btn"
                  onClick={() => setShowFormModal(true)}
                >
                  <Plus size={20} />
                  <span>Add Event</span>
                </button>
              </div>

              {/* Stats Cards */}
              <div className="countdown-stats-grid">
                <div className="stat-card">
                  <p className="stat-label">Total Events</p>
                  <p className="stat-value">{String(countdowns.length).padStart(2, '0')}</p>
                </div>
                <div className="stat-card">
                  <p className="stat-label">Next Event</p>
                  {countdowns.length > 0 ? (() => {
                    const diff = new Date(countdowns[0].targetDate).getTime() - now.getTime()
                    const days = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
                    return <p className="stat-value-sm">{days} Days Left</p>
                  })() : <p className="stat-value-sm">--</p>}
                </div>
                <div className="stat-card">
                  <p className="stat-label">Completion Rate</p>
                  <p className="stat-value-sm">--</p>
                </div>
              </div>

              {/* Event List */}
              <div className="countdown-events-wrapper">
                {countdowns.map((item) => {
                  const isActive = selectedEventId === item.id
                  const diff = new Date(item.targetDate).getTime() - now.getTime()
                  const isCompleted = diff <= 0
                  const days = isCompleted ? 0 : Math.floor(diff / (1000 * 60 * 60 * 24))

                  return (
                    <div 
                      key={item.id} 
                      className={`event-list-item ${isActive ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedEventId(item.id)
                        setShowDetailSidebar(true)
                      }}
                    >
                      <div className="event-icon-box">
                        {IconMap[item.icon || 'ClipboardList'] || <ClipboardList size={28} />}
                      </div>
                      <div className="event-info">
                        <h4 className="event-title">{item.name}</h4>
                        <p className="event-subtitle">{item.icon || 'Event'}</p>
                      </div>
                      <div className="event-meta">
                        <p className={`event-days ${isCompleted ? 'event-days-completed' : ''}`}>{days}d</p>
                        <p className="event-date">{formatTargetDate(item.targetDate)}</p>
                      </div>
                    </div>
                  )
                })}

                {countdowns.length === 0 && (
                  <div className="empty-panel">
                    <CalendarClock size={32} />
                    <h3>No countdowns yet</h3>
                    <p>Add an exam, deadline, or milestone.</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Right Detail Sidebar */}
          {showDetailSidebar && selectedEvent && (
            <aside className="countdown-detail-sidebar">
              <div className="detail-sidebar-header">
                <h3>Event Details</h3>
                <div className="detail-actions">
                  <button onClick={() => editCountdown(selectedEvent)}><Edit3 size={18} /></button>
                  <button className="btn-delete" onClick={() => confirmDelete(selectedEvent)}><Trash2 size={18} /></button>
                  <button onClick={() => setShowDetailSidebar(false)}><X size={18} /></button>
                </div>
              </div>

              <div className="detail-content">
                {/* Visual Circle */}
                <div className="detail-visual">
                  <div className="visual-ring">
                    <svg viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="42" className="ring-bg" />
                      <circle cx="50" cy="50" r="42" className="ring-progress" style={{ strokeDashoffset: 66 }} />
                    </svg>
                    <div className="visual-text">
                      <span className="days-number">
                        {Math.max(0, Math.floor((new Date(selectedEvent.targetDate).getTime() - now.getTime()) / 86400000))}
                      </span>
                      <span className="days-label">Days Left</span>
                    </div>
                  </div>
                  <h2 className="detail-title">{selectedEvent.name}</h2>
                  <div className="detail-location">
                    <MapPin size={16} />
                    <span>General Event</span>
                  </div>
                </div>

                {/* Grid */}
                <div className="detail-grid">
                  <div className="grid-item">
                    <span className="grid-label">Target Date</span>
                    <span className="grid-value">{formatTargetDate(selectedEvent.targetDate)}</span>
                  </div>
                  <div className="grid-item">
                    <span className="grid-label">Status</span>
                    <div className="status-flex">
                      <div className="status-dot"></div>
                      <span className="grid-value">On Track</span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="detail-notes">
                  <label>Preparation Notes</label>
                  <div className="notes-box">
                    <ul>
                      <li>Review relevant study material</li>
                      <li>Double check time and location</li>
                    </ul>
                  </div>
                </div>

                {/* Checklist (Mock) */}
                <div className="detail-progress">
                  <div className="progress-header">
                    <label>Preparation Progress</label>
                    <span>0%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '0%' }}></div>
                  </div>
                </div>

                <button className="related-tasks-btn">
                  <div className="left">
                    <CheckSquare size={18} />
                    <span>0 Preparation Tasks</span>
                  </div>
                </button>
              </div>
            </aside>
          )}
        </div>

        {/* Modal Form */}
        {showFormModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3>{editingId ? 'Edit Event' : 'Add New Event'}</h3>
                <button onClick={resetForm}><X size={20} /></button>
              </div>
              <form onSubmit={submitCountdown}>
                <label>
                  Event Name
                  <input required value={name} onChange={e => setName(e.target.value)} placeholder="E.g., JLPT N2 Exam" />
                </label>
                <label>
                  Target Date & Time
                  <input type="datetime-local" required value={targetDate} onChange={e => setTargetDate(e.target.value)} />
                </label>
                <label>
                  Icon Symbol
                  <select value={icon} onChange={e => setIcon(e.target.value)}>
                    <option value="ClipboardList">Clipboard</option>
                    <option value="FileText">Document</option>
                    <option value="GraduationCap">Graduation</option>
                  </select>
                </label>
                <label>
                  Accent Color
                  <div className="color-picker-wrapper">
                    <input type="color" value={color} onChange={e => setColor(e.target.value)} />
                    <span className="color-picker-text">{color}</span>
                  </div>
                </label>
                <div className="modal-actions">
                  <button type="button" className="btn-cancel" onClick={resetForm}>Cancel</button>
                  <button type="submit" className="btn-submit">Save Event</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
