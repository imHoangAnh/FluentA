import { 
  BarChart3, BookOpen, CalendarClock, CheckSquare, Columns3, Flame, Globe, HelpCircle, Layers,
  LogOut, NotebookPen, Repeat2, Settings, Kanban, Plus, 
  ChevronLeft, ChevronRight, Edit3, Trash2, X, Timer
} from 'lucide-react'
import { type FormEvent, useMemo, useState } from 'react'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation } from 'react-router-dom'
import { getUserAvatarUrl } from '../../lib/avatar'
import { LearningNavLinks } from '../../components/LearningNavLinks'
import { useAuthStore } from '../../stores/authStore'
import * as habitApi from '../../lib/api/habit.api'
import { HabitIconGlyph } from '../../lib/habit-icons'
import { habitIconOptions } from '../../lib/habit-icon-options'

const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

type HabitFormState = {
  name: string
  description: string
  icon: habitApi.HabitIcon
  frequency: habitApi.HabitFrequency
  customDays: string[]
  reminderEnabled: boolean
}

function emptyForm(): HabitFormState {
  return {
    name: '',
    description: '',
    icon: 'Default',
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

function startOfWeek(date: Date) {
  const monday = new Date(date)
  const day = monday.getDay()
  monday.setDate(monday.getDate() - day + (day === 0 ? -6 : 1))
  monday.setHours(0, 0, 0, 0)
  return monday
}

function parseDateInput(dateValue: string) {
  const [year, month, day] = dateValue.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function shiftWeek(dateValue: string, weeks: number) {
  const date = parseDateInput(dateValue)
  date.setDate(date.getDate() + weeks * 7)
  return toDateInput(date)
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
    icon: form.icon,
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
  const [selectedWeekStart, setSelectedWeekStart] = useState(() => toDateInput(startOfWeek(new Date())))
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<HabitFormState>(emptyForm)
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [iconMenuOpen, setIconMenuOpen] = useState(false)

  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const location = useLocation()
  const displayName = user?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'Learner'
  const avatarUrl = getUserAvatarUrl(user, displayName)

  const weekDates = useMemo(() => {
    const monday = parseDateInput(selectedWeekStart)
    
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
  }, [selectedWeekStart, today])

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

  const weekEntryMonths = useMemo(
    () => [...new Set(weekDates.map(({ date }) => toMonthInput(date)))],
    [weekDates],
  )
  const entryQueryKeys = useMemo(
    () => {
      const keys = habits.flatMap((habit) => weekEntryMonths.map((month) => ({ habitId: habit.id, month })))
      if (selectedHabit && !weekEntryMonths.includes(selectedMonth)) {
        keys.push({ habitId: selectedHabit.id, month: selectedMonth })
      }
      return keys
    },
    [habits, selectedHabit, selectedMonth, weekEntryMonths],
  )
  const entryQueries = useQueries({
    queries: entryQueryKeys.map(({ habitId, month }) => ({
      queryKey: ['habit', 'entries', habitId, month, timeZoneId],
      queryFn: () => habitApi.listHabitEntries(habitId, month, timeZoneId),
    })),
  })

  const entriesByHabit = useMemo(() => {
    const entries = new Map(habits.map((habit) => [habit.id, new Set<string>()]))
    entryQueryKeys.forEach(({ habitId }, index) => {
      for (const entry of entryQueries[index]?.data ?? []) entries.get(habitId)?.add(entry.date)
    })
    return entries
  }, [entryQueries, entryQueryKeys, habits])

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['habit'] })
  }

  const resetForm = () => {
    setEditingId(null)
    setForm(emptyForm())
    setIconMenuOpen(false)
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
      icon: habit.icon,
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

      <main className="dashboard-main habit-tracker-main">
        {/* LEFT: HABIT LIST */}
        <div className="habit-tracker-sidebar">
          {/* Top Header */}
          <header className="habit-tracker-header">
            <div className="habit-tracker-header-title">
              <h2>Habit Tracker</h2>
            </div>
            <div className="habit-tracker-header-actions">
              <button aria-label="Create habit" onClick={() => { resetForm(); setShowForm(true); }}><Plus size={24} /></button>
            </div>
          </header>
          
          {/* Weekly Tracker Bar */}
          <div className="habit-tracker-week">
            <div className="habit-week-navigation">
              <button type="button" onClick={() => setSelectedWeekStart((week) => shiftWeek(week, -1))} aria-label="Previous week">
                <ChevronLeft size={18} />
              </button>
              <strong>{weekDates[0].dateStr} – {weekDates[6].dateStr}</strong>
              <button type="button" onClick={() => setSelectedWeekStart((week) => shiftWeek(week, 1))} aria-label="Next week">
                <ChevronRight size={18} />
              </button>
            </div>
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
              
              return (
                <div 
                  key={habit.id}
                  onClick={() => setSelectedHabitId(habit.id)}
                  className={`habit-list-card ${isSelected ? 'active' : ''}`}
                >
                  <div className="habit-list-card-meta">
                    <div className="habit-list-card-icon">
                      <HabitIconGlyph icon={habit.icon} size={22} />
                    </div>
                    <div className="habit-list-card-info">
                      <p className="habit-list-card-name">{habit.name}</p>
                      <span className="habit-list-card-streak" aria-label={`${habit.currentStreak} day current streak`}>
                        <Flame size={14} /> {habit.currentStreak}
                      </span>
                    </div>
                  </div>
                  <div className="habit-list-card-week" aria-label={`${habit.name} selected week`}>
                    {weekDates.map(({ dateStr, dayName, dayNum }) => {
                      const isCompleted = completedDates.has(dateStr)
                      const disabled = dateStr > today || !isScheduled(habit, dateStr)
                      const action = isCompleted ? 'Uncheck' : 'Check'
                      return (
                        <button
                          type="button"
                          key={dateStr}
                          className={`habit-week-cell ${isCompleted ? 'completed' : ''}`}
                          disabled={disabled}
                          aria-label={`${action} ${habit.name} on ${dateStr}`}
                          title={`${dayName} ${dayNum}`}
                          onClick={(event) => {
                            event.stopPropagation()
                            toggleEntry.mutate({ habitId: habit.id, date: dateStr })
                          }}
                        >
                          {isCompleted ? <CheckSquare size={15} /> : dayNum}
                        </button>
                      )
                    })}
                  </div>
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
                  <div className="habit-details-icon">
                    <HabitIconGlyph icon={selectedHabit.icon} size={34} />
                  </div>
                  <div className="habit-details-text">
                    <h3>{selectedHabit.name}</h3>
                    <p>
                      {scheduleText(selectedHabit)}
                    </p>
                  </div>
                </div>
                <div className="habit-details-actions">
                  <Link aria-label={`View stats for ${selectedHabit.name}`} to={`/habits/${selectedHabit.id}/stats`}><BarChart3 size={20} /></Link>
                  <button aria-label={`Edit ${selectedHabit.name}`} onClick={() => { editHabit(selectedHabit); setShowForm(true); }}><Edit3 size={20} /></button>
                  <button aria-label={`Delete ${selectedHabit.name}`} className="danger" onClick={() => confirmDelete(selectedHabit)}><Trash2 size={20} /></button>
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

              {selectedHabit.description ? (
                <section className="habit-description-card" aria-label="Habit description">
                  <h4>Description</h4>
                  <p>{selectedHabit.description}</p>
                </section>
              ) : null}

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
                  <input data-testid="habit-name-input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Read a book" />
                </label>
                
                <label>
                  Description
                  <input data-testid="habit-description-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="30 minutes every day" />
                </label>

                <div className="habit-icon-field">
                  <span>Icon</span>
                  <div className="habit-icon-select">
                    <button
                      type="button"
                      className="habit-icon-select-trigger"
                      aria-haspopup="listbox"
                      aria-expanded={iconMenuOpen}
                      aria-label="Habit icon"
                      onClick={() => setIconMenuOpen((open) => !open)}
                    >
                      <HabitIconGlyph icon={form.icon} size={18} />
                      <span>{form.icon}</span>
                      <ChevronRight className={iconMenuOpen ? 'open' : ''} size={17} />
                    </button>
                    {iconMenuOpen ? (
                      <div className="habit-icon-options" role="listbox" aria-label="Habit icon">
                        {habitIconOptions.map((option) => (
                          <button
                            type="button"
                            role="option"
                            aria-selected={form.icon === option.value}
                            key={option.value}
                            onClick={() => {
                              setForm((current) => ({ ...current, icon: option.value }))
                              setIconMenuOpen(false)
                            }}
                          >
                            <HabitIconGlyph icon={option.value} size={18} />
                            <span>{option.label}</span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
                
                <label>
                  Frequency
                  <select value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value as habitApi.HabitFrequency }))}>
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
                  <button data-testid="save-habit-button" type="submit" className="habit-btn-submit" disabled={!canSubmit || isSaving}>
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
