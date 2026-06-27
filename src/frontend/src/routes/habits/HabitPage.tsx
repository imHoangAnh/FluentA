import { 
  BookOpen, CalendarClock, CheckSquare, Columns3, Globe, HelpCircle, Layers, 
  LogOut, NotebookPen, Repeat2, Settings, Kanban, Plus, 
  ChevronLeft, ChevronRight, Edit3, Trash2, X, Timer
} from 'lucide-react'
import { type FormEvent, useMemo, useState } from 'react'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import * as habitApi from '../../lib/api/habit.api'

const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

type HabitFormState = {
  name: string
  description: string
  color: string
  icon: string
  frequency: habitApi.HabitFrequency
  customDays: string[]
  reminderEnabled: boolean
}

function emptyForm(): HabitFormState {
  return {
    name: '',
    description: '',
    color: '#22C55E',
    icon: '',
    frequency: 'Daily',
    customDays: [],
    reminderEnabled: true,
  }
}

function browserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

function toDateInput(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toMonthInput(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  return `${year}-${month}`
}

function parseMonth(monthValue: string) {
  const [year, month] = monthValue.split('-').map(Number)
  return new Date(year, month - 1, 1)
}

function shiftMonth(monthValue: string, months: number) {
  const date = parseMonth(monthValue)
  date.setMonth(date.getMonth() + months)
  return toMonthInput(date)
}

function monthDates(monthValue: string) {
  const start = parseMonth(monthValue)
  const next = new Date(start.getFullYear(), start.getMonth() + 1, 1)
  const dates: string[] = []
  for (const cursor = new Date(start); cursor < next; cursor.setDate(cursor.getDate() + 1)) {
    dates.push(toDateInput(cursor))
  }

  return dates
}

function dayOfWeek(dateValue: string) {
  const [year, month, day] = dateValue.split('-').map(Number)
  return weekdays[new Date(year, month - 1, day).getDay()]
}

function dayNumber(dateValue: string) {
  return Number(dateValue.slice(-2))
}

function formatMonth(monthValue: string) {
  const date = parseMonth(monthValue)
  return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(date)
}

function isScheduled(habit: habitApi.Habit, dateValue: string) {
  return habit.frequency === 'Daily' || habit.customDays.includes(dayOfWeek(dateValue))
}

function scheduleText(habit: habitApi.Habit) {
  return habit.frequency === 'Daily' ? 'Daily' : habit.customDays.join(', ')
}

function completionRate(habit: habitApi.Habit, dates: string[], completedDates: Set<string>) {
  const scheduled = dates.filter((date) => isScheduled(habit, date))
  if (scheduled.length === 0) return 0
  const completed = scheduled.filter((date) => completedDates.has(date)).length
  return Math.round((completed / scheduled.length) * 100)
}

function toPayload(form: HabitFormState) {
  return {
    name: form.name,
    description: form.description.trim() ? form.description : null,
    color: form.color.trim() ? form.color : null,
    icon: form.icon.trim() ? form.icon : null,
    frequency: form.frequency,
    customDays: form.frequency === 'Custom' ? form.customDays : null,
    reminderEnabled: form.reminderEnabled,
  }
}

export function HabitPage() {
  const queryClient = useQueryClient()
  const timeZoneId = useMemo(() => browserTimeZone(), [])
  const today = useMemo(() => toDateInput(new Date()), [])
  const [selectedMonth, setSelectedMonth] = useState(() => toMonthInput(new Date()))
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<HabitFormState>(emptyForm)
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const location = useLocation()
  const displayName = user?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'Learner'

  const weekDates = useMemo(() => {
    const todayDate = new Date()
    const currentDayOfWeek = todayDate.getDay() // 0 is Sunday
    const monday = new Date(todayDate)
    const diff = todayDate.getDate() - currentDayOfWeek + (currentDayOfWeek === 0 ? -6 : 1)
    monday.setDate(diff)
    
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      return {
        date: d,
        dateStr: toDateInput(d),
        dayName: weekdays[d.getDay()].slice(0, 3),
        dayNum: d.getDate(),
        isToday: toDateInput(d) === today
      }
    })
  }, [today])

  const dates = useMemo(() => monthDates(selectedMonth), [selectedMonth])

  const habitsQuery = useQuery({
    queryKey: ['habit', 'list', timeZoneId],
    queryFn: () => habitApi.listHabits(timeZoneId),
  })

  const habits = useMemo(
    () => (habitsQuery.data ?? []).toSorted((left, right) => left.createdAt.localeCompare(right.createdAt) || left.name.localeCompare(right.name)),
    [habitsQuery.data],
  )
  
  const selectedHabit = useMemo(() => habits.find(h => h.id === selectedHabitId) || habits[0], [habits, selectedHabitId])

  const entryQueries = useQueries({
    queries: habits.map((habit) => ({
      queryKey: ['habit', 'entries', habit.id, selectedMonth, timeZoneId],
      queryFn: () => habitApi.listHabitEntries(habit.id, selectedMonth, timeZoneId),
      enabled: habits.length > 0,
    })),
  })

  const entriesByHabit = useMemo(() => {
    return new Map(habits.map((habit, index) => [
      habit.id,
      new Set((entryQueries[index]?.data ?? []).map((entry) => entry.date)),
    ]))
  }, [entryQueries, habits])

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['habit'] })
  }

  const resetForm = () => {
    setEditingId(null)
    setForm(emptyForm())
  }

  const createHabit = useMutation({
    mutationFn: habitApi.createHabit,
    onSuccess: async () => {
      resetForm()
      await refresh()
    },
  })

  const updateHabit = useMutation({
    mutationFn: (input: { id: string; patch: habitApi.UpdateHabitInput }) => habitApi.updateHabit(input.id, input.patch),
    onSuccess: async () => {
      resetForm()
      await refresh()
    },
  })

  const deleteHabit = useMutation({
    mutationFn: habitApi.deleteHabit,
    onSuccess: async () => {
      await refresh()
    },
  })

  const toggleEntry = useMutation({
    mutationFn: (input: { habitId: string; date: string }) => habitApi.toggleHabitEntry(input.habitId, input.date, timeZoneId),
    onSuccess: async () => {
      await refresh()
    },
  })

  const isSaving = createHabit.isPending || updateHabit.isPending
  const canSubmit = form.name.trim().length > 0 && (form.frequency === 'Daily' || form.customDays.length > 0)

  function submitHabit(event: FormEvent) {
    event.preventDefault()
    if (!canSubmit) return

    if (editingId) {
      updateHabit.mutate({ id: editingId, patch: toPayload(form) })
    } else {
      createHabit.mutate(toPayload(form))
    }
  }

  function editHabit(habit: habitApi.Habit) {
    setEditingId(habit.id)
    setForm({
      name: habit.name,
      description: habit.description ?? '',
      color: habit.color ?? '#22C55E',
      icon: habit.icon ?? '',
      frequency: habit.frequency,
      customDays: habit.customDays,
      reminderEnabled: habit.reminderEnabled,
    })
  }

  function confirmDelete(habit: habitApi.Habit) {
    if (window.confirm(`Delete "${habit.name}"?`)) {
      deleteHabit.mutate(habit.id)
    }
  }

  function toggleCustomDay(day: string) {
    setForm((current) => ({
      ...current,
      customDays: current.customDays.includes(day)
        ? current.customDays.filter((customDay) => customDay !== day)
        : [...current.customDays, day],
    }))
  }

  return (
    <div className="dashboard-layout">
      {/* SideNavBar exactly like KanbanPage/JournalPage */}
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
              <p className="dashboard-user-level">Learner Profile</p>
            </div>
          </div>
          <div className="dashboard-user-links">
            <Link to="/settings/review"><Settings size={16} /> Settings</Link>
            <Link to="#"><HelpCircle size={16} /> Help</Link>
            <Link to="#" onClick={(e) => { e.preventDefault(); void logout() }}><LogOut size={16} /> Logout</Link>
          </div>
        </div>
      </aside>

      <main className="dashboard-main habit-tracker-main">
        {/* LEFT: HABIT LIST */}
        <div className="habit-tracker-sidebar">
          {/* Top Header */}
          <header className="habit-tracker-header">
            <div className="habit-tracker-header-title">
              <h2>Habit Tracker</h2>
            </div>
            <div className="habit-tracker-header-actions">
              <button onClick={() => { resetForm(); setShowForm(true); }}><Plus size={24} /></button>
            </div>
          </header>
          
          {/* Weekly Tracker Bar */}
          <div className="habit-tracker-week">
            <div className="habit-tracker-week-grid">
              {weekDates.map(({dateStr, dayName, dayNum, isToday}) => (
                <div key={dateStr} className="habit-tracker-week-day">
                  <p className={isToday ? 'active' : ''}>{dayName}</p>
                  <div className={`habit-tracker-week-date ${isToday ? 'active' : ''}`}>
                    {dayNum}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Habit List Scrollable */}
          <div className="habit-tracker-list">
            {habitsQuery.isLoading ? <p className="habit-tracker-loading">Loading habits...</p> : null}
            {habits.length === 0 && !habitsQuery.isLoading ? (
              <div className="habit-tracker-empty">
                <CalendarClock size={40} />
                <p>No habits yet. Let's build a new one!</p>
              </div>
            ) : null}

            {habits.map(habit => {
              const isSelected = selectedHabit?.id === habit.id
              const completedDates = entriesByHabit.get(habit.id) ?? new Set<string>()
              const isCompletedToday = completedDates.has(today)
              
              return (
                <div 
                  key={habit.id}
                  onClick={() => setSelectedHabitId(habit.id)}
                  className={`habit-list-card ${isSelected ? 'active' : ''}`}
                >
                  <div className="habit-list-card-content">
                    <div className="habit-list-card-icon" style={{ backgroundColor: `${habit.color}20` || '#e2e8f0' }}>
                      {habit.icon || '📌'}
                    </div>
                    <div className="habit-list-card-info">
                      <p className="habit-list-card-name">{habit.name}</p>
                      <div className="habit-list-card-streak">
                        <span><CalendarClock size={14} /> {habit.currentStreak} Days Streak</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Quick toggle for today */}
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleEntry.mutate({ habitId: habit.id, date: today }) }}
                    className={`habit-list-card-toggle ${isCompletedToday ? 'completed' : ''}`}
                  >
                    <CheckSquare size={16} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* RIGHT: HABIT DETAILS/INSIGHTS */}
        <div className="habit-tracker-details">
          {selectedHabit ? (
            <div className="habit-tracker-details-inner">
              {/* Selected Habit Header */}
              <div className="habit-details-header">
                <div className="habit-details-title-area">
                  <div className="habit-details-icon" style={{ backgroundColor: `${selectedHabit.color}20` || '#e2e8f0' }}>
                    {selectedHabit.icon || '📌'}
                  </div>
                  <div className="habit-details-text">
                    <h3>{selectedHabit.name}</h3>
                    <p>
                      <span className="habit-color-dot" style={{ backgroundColor: selectedHabit.color || '#e2e8f0' }}></span>
                      {scheduleText(selectedHabit)}
                    </p>
                  </div>
                </div>
                <div className="habit-details-actions">
                  <button onClick={() => { editHabit(selectedHabit); setShowForm(true); }}><Edit3 size={20} /></button>
                  <button className="danger" onClick={() => confirmDelete(selectedHabit)}><Trash2 size={20} /></button>
                </div>
              </div>

              {/* Stats Bento Grid */}
              <div className="habit-stats-grid">
                <div className="habit-stat-card">
                  <div className="habit-stat-label">
                    <CheckSquare size={18} className="icon-primary" />
                    <span>Total Check-ins</span>
                  </div>
                  <p className="habit-stat-value">{entriesByHabit.get(selectedHabit.id)?.size || 0} <span>Days</span></p>
                </div>
                
                <div className="habit-stat-card">
                  <div className="habit-stat-label">
                    <Repeat2 size={18} className="icon-primary" />
                    <span>Check-in Rate</span>
                  </div>
                  <p className="habit-stat-value">{completionRate(selectedHabit, dates, entriesByHabit.get(selectedHabit.id) ?? new Set())} <span>%</span></p>
                </div>
                
                <div className="habit-stat-card">
                  <div className="habit-stat-label">
                    <CalendarClock size={18} className="icon-orange" />
                    <span>Current Streak</span>
                  </div>
                  <p className="habit-stat-value">{selectedHabit.currentStreak} <span>Days</span></p>
                </div>

                <div className="habit-stat-card">
                  <div className="habit-stat-label">
                    <Layers size={18} className="icon-purple" />
                    <span>Best Streak</span>
                  </div>
                  <p className="habit-stat-value">{Math.max(selectedHabit.currentStreak, 0)} <span>Days</span></p>
                </div>
              </div>

              {/* Monthly Calendar Grid */}
              <div className="habit-calendar-card">
                <div className="habit-calendar-header">
                  <button onClick={() => setSelectedMonth(m => shiftMonth(m, -1))}><ChevronLeft size={20} /></button>
                  <h4>{formatMonth(selectedMonth)}</h4>
                  <button onClick={() => setSelectedMonth(m => shiftMonth(m, 1))}><ChevronRight size={20} /></button>
                </div>
                <div className="habit-calendar-grid">
                  {/* Days Header */}
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => <div key={i} className="habit-calendar-day-header">{d}</div>)}
                  
                  {/* Grid filler for first day of month */}
                  {Array.from({ length: (parseMonth(selectedMonth).getDay() + 6) % 7 }).map((_, i) => <div key={`empty-${i}`} />)}
                  
                  {/* Days */}
                  {dates.map(date => {
                    const isCompleted = (entriesByHabit.get(selectedHabit.id) ?? new Set()).has(date)
                    const isScheduledDay = isScheduled(selectedHabit, date)
                    const isFuture = date > today
                    return (
                      <div key={date} className="habit-calendar-day-cell">
                        <button
                          onClick={() => toggleEntry.mutate({ habitId: selectedHabit.id, date })}
                          disabled={!isScheduledDay || isFuture}
                          className={`habit-calendar-day-btn ${isCompleted ? 'completed' : ''} ${date === today ? 'today' : ''} ${!isScheduledDay || isFuture ? 'disabled' : ''}`}
                          style={isCompleted ? { backgroundColor: selectedHabit.color ?? undefined, color: '#fff' } : undefined}
                        >
                          {dayNumber(date)}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="habit-tracker-empty-state">
              <CalendarClock size={80} />
              <p>Select a habit to view your progress</p>
            </div>
          )}
        </div>
        
        {/* Habit Form Modal */}
        {showForm && (
          <div className="habit-modal-overlay">
            <div className="habit-modal">
              <div className="habit-modal-header">
                <h3>{editingId ? 'Edit Habit' : 'New Habit'}</h3>
                <button onClick={() => { setShowForm(false); resetForm(); }}><X size={24} /></button>
              </div>
              
              <form onSubmit={(e) => { submitHabit(e); setShowForm(false); }} className="habit-modal-form">
                <label>
                  Habit Name
                  <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Read a book" />
                </label>
                
                <label>
                  Description
                  <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="30 minutes every day" />
                </label>

                <div className="habit-modal-form-row">
                  <label>
                    Icon (Emoji)
                    <input value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} placeholder="📖" />
                  </label>
                  <label>
                    Color
                    <div className="habit-color-picker">
                      <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} />
                    </div>
                  </label>
                </div>
                
                <label>
                  Frequency
                  <select value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value as any }))}>
                    <option value="Daily">Every day</option>
                    <option value="Custom">Custom days</option>
                  </select>
                </label>
                
                {form.frequency === 'Custom' && (
                  <div className="habit-weekdays-toggle">
                    {weekdays.map(day => (
                      <button 
                        type="button"
                        key={day} 
                        onClick={() => toggleCustomDay(day)}
                        className={form.customDays.includes(day) ? 'active' : ''}
                      >
                        {day.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                )}
                
                <div className="habit-modal-footer">
                  <button type="button" className="habit-btn-cancel" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</button>
                  <button type="submit" className="habit-btn-submit" disabled={!canSubmit || isSaving}>
                    {editingId ? 'Save Changes' : 'Create Habit'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
