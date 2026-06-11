import { ArrowLeft, ArrowRight, BarChart3, CalendarCheck, Edit3, Home, Loader2, Plus, Save, Trash2 } from 'lucide-react'
import { type FormEvent, useMemo, useState } from 'react'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import * as habitApi from '../../lib/api/habit.api'

const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

type HabitFormState = {
  name: string
  description: string
  color: string
  icon: string
  frequency: habitApi.HabitFrequency
  customDays: string[]
}

function emptyForm(): HabitFormState {
  return {
    name: '',
    description: '',
    color: '#22C55E',
    icon: '',
    frequency: 'Daily',
    customDays: [],
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
  }
}

export function HabitPage() {
  const queryClient = useQueryClient()
  const timeZoneId = useMemo(() => browserTimeZone(), [])
  const today = useMemo(() => toDateInput(new Date()), [])
  const [selectedMonth, setSelectedMonth] = useState(() => toMonthInput(new Date()))
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<HabitFormState>(emptyForm)

  const dates = useMemo(() => monthDates(selectedMonth), [selectedMonth])

  const habitsQuery = useQuery({
    queryKey: ['habit', 'list', timeZoneId],
    queryFn: () => habitApi.listHabits(timeZoneId),
  })

  const habits = useMemo(
    () => (habitsQuery.data ?? []).toSorted((left, right) => left.createdAt.localeCompare(right.createdAt) || left.name.localeCompare(right.name)),
    [habitsQuery.data],
  )

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
    <main className="workspace habit-workspace">
      <header className="workspace-header">
        <div className="brand-inline">
          <span className="brand-mark brand-mark--small">FA</span>
          <strong>FluentA</strong>
        </div>
        <nav className="workspace-nav" aria-label="Habit navigation">
          <Link className="ghost-button ghost-button--inline" to="/">
            <BarChart3 size={17} /> Dashboard
          </Link>
          <Link className="ghost-button ghost-button--inline" to="/vocabulary">
            <Home size={17} /> Vocabulary
          </Link>
        </nav>
      </header>

      <section className="habit-shell">
        <div className="habit-hero">
          <div>
            <span className="preview-label">Habit Tracker</span>
            <h1>Monthly rhythm</h1>
            <p>{habits.length} habits · {formatMonth(selectedMonth)} · {timeZoneId}</p>
          </div>
          <CalendarCheck size={34} />
        </div>

        <form className="habit-form" onSubmit={submitHabit}>
          <label>
            Habit
            <input
              data-testid="habit-name-input"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Read English"
            />
          </label>
          <label>
            Description
            <input
              data-testid="habit-description-input"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="30 minutes after breakfast"
            />
          </label>
          <label>
            Color
            <input
              aria-label="Habit color"
              className="habit-color-input"
              type="color"
              value={form.color}
              onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))}
            />
          </label>
          <label>
            Icon
            <input
              data-testid="habit-icon-input"
              value={form.icon}
              onChange={(event) => setForm((current) => ({ ...current, icon: event.target.value }))}
              placeholder="Book"
            />
          </label>
          <label>
            Frequency
            <select
              data-testid="habit-frequency-select"
              value={form.frequency}
              onChange={(event) => setForm((current) => ({ ...current, frequency: event.target.value as habitApi.HabitFrequency }))}
            >
              <option value="Daily">Daily</option>
              <option value="Custom">Custom days</option>
            </select>
          </label>
          <button className="primary-button" type="submit" disabled={isSaving || !canSubmit} data-testid="save-habit-button">
            {isSaving ? <Loader2 size={18} /> : editingId ? <Save size={18} /> : <Plus size={18} />}
            {editingId ? 'Save habit' : 'Add habit'}
          </button>
          {editingId ? (
            <button className="ghost-button ghost-button--inline" type="button" onClick={resetForm}>
              Cancel
            </button>
          ) : null}

          {form.frequency === 'Custom' ? (
            <fieldset className="habit-weekdays">
              <legend>Scheduled days</legend>
              {weekdays.map((day) => (
                <label key={day}>
                  <input
                    checked={form.customDays.includes(day)}
                    type="checkbox"
                    onChange={() => toggleCustomDay(day)}
                  />
                  {day.slice(0, 3)}
                </label>
              ))}
            </fieldset>
          ) : null}
        </form>

        <div className="habit-month-controls" aria-label="Habit month controls">
          <button className="ghost-button ghost-button--inline" type="button" onClick={() => setSelectedMonth((month) => shiftMonth(month, -1))}>
            <ArrowLeft size={17} /> Previous
          </button>
          <strong>{formatMonth(selectedMonth)}</strong>
          <button className="ghost-button ghost-button--inline" type="button" onClick={() => setSelectedMonth(toMonthInput(new Date()))}>
            This month
          </button>
          <button className="ghost-button ghost-button--inline" type="button" onClick={() => setSelectedMonth((month) => shiftMonth(month, 1))}>
            Next <ArrowRight size={17} />
          </button>
        </div>

        {habitsQuery.isLoading ? <p className="flashcard-status">Loading habits...</p> : null}
        {habitsQuery.isError ? <p className="flashcard-status flashcard-status--error">Could not load habits.</p> : null}

        {!habitsQuery.isLoading && !habitsQuery.isError ? (
          <section className="habit-grid-panel" aria-label="Habit monthly grid">
            {habits.length === 0 ? (
              <div className="empty-panel habit-empty">
                <CalendarCheck size={28} />
                <h2>No habits yet</h2>
                <p>Add one recurring study habit and start making the month visible.</p>
              </div>
            ) : null}

            {habits.length > 0 ? (
              <div className="habit-grid-wrap">
                <div className="habit-grid" style={{ gridTemplateColumns: `minmax(220px, 260px) repeat(${dates.length}, minmax(42px, 1fr))` }}>
                  <div className="habit-grid__corner">Habit</div>
                  {dates.map((date) => (
                    <div className={date === today ? 'habit-grid__day habit-grid__day--today' : 'habit-grid__day'} key={date}>
                      <span>{dayOfWeek(date).slice(0, 3)}</span>
                      <strong>{dayNumber(date)}</strong>
                    </div>
                  ))}

                  {habits.map((habit) => {
                    const completedDates = entriesByHabit.get(habit.id) ?? new Set<string>()
                    const rate = completionRate(habit, dates, completedDates)
                    return (
                      <div className="habit-grid__row" role="row" key={habit.id}>
                        <article className="habit-card">
                          <span className="habit-card__color" style={{ backgroundColor: habit.color ?? '#22C55E' }} />
                          <div>
                            <span className="preview-label">{habit.icon || scheduleText(habit)}</span>
                            <h2>{habit.name}</h2>
                            {habit.description ? <p>{habit.description}</p> : null}
                          </div>
                          <dl>
                            <div>
                              <dt>Streak</dt>
                              <dd>{habit.currentStreak} days</dd>
                            </div>
                            <div>
                              <dt>Month</dt>
                              <dd>{rate}%</dd>
                            </div>
                            <div>
                              <dt>Today</dt>
                              <dd>{habit.isScheduledToday ? (habit.isCheckedToday ? 'Done' : 'Open') : 'Rest'}</dd>
                            </div>
                          </dl>
                          <footer>
                            <Link className="ghost-button ghost-button--inline" to={`/habits/${habit.id}/stats`} aria-label={`View stats for ${habit.name}`}>
                              <BarChart3 size={16} /> Stats
                            </Link>
                            <button className="ghost-button ghost-button--inline" type="button" onClick={() => editHabit(habit)} aria-label={`Edit ${habit.name}`}>
                              <Edit3 size={16} /> Edit
                            </button>
                            <button className="icon-button icon-button--danger" type="button" onClick={() => confirmDelete(habit)} aria-label={`Delete ${habit.name}`}>
                              <Trash2 size={17} />
                            </button>
                          </footer>
                        </article>

                        {dates.map((date) => {
                          const scheduled = isScheduled(habit, date)
                          const future = date > today
                          const completed = completedDates.has(date)
                          const disabled = !scheduled || future || toggleEntry.isPending
                          const label = `${completed ? 'Uncheck' : 'Check'} ${habit.name} on ${date}`
                          return (
                            <button
                              aria-label={label}
                              className={[
                                'habit-cell',
                                scheduled ? 'habit-cell--scheduled' : 'habit-cell--unscheduled',
                                completed ? 'habit-cell--completed' : '',
                                future ? 'habit-cell--future' : '',
                              ].filter(Boolean).join(' ')}
                              data-testid={`habit-cell-${habit.id}-${date}`}
                              disabled={disabled}
                              key={date}
                              style={completed ? { backgroundColor: habit.color ?? '#22C55E' } : undefined}
                              type="button"
                              onClick={() => toggleEntry.mutate({ habitId: habit.id, date })}
                              title={!scheduled ? 'Not scheduled' : future ? 'Future dates cannot be toggled' : label}
                            >
                              <span>{completed ? '✓' : scheduled ? '' : '·'}</span>
                            </button>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}
      </section>
    </main>
  )
}
