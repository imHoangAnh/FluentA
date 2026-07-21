import { ChevronRight, X } from 'lucide-react'
import { type FormEvent, useEffect, useId, useRef, useState } from 'react'
import type { CreateHabitInput, Habit, HabitFrequency, HabitIcon } from '../api/habit.api'
import { weekdays } from '../habit-date'
import { habitIconOptions } from './habit-icon-options'
import { HabitIconGlyph } from './habit-icons'

const goalPresets = [7, 21, 30, 100, 365]

type HabitFormDialogProps = {
  habit?: Habit
  today: string
  timeZoneId: string
  isSaving: boolean
  error?: string
  onClose: () => void
  onSubmit: (payload: CreateHabitInput) => void
}

type FormState = {
  name: string
  description: string
  icon: HabitIcon
  frequency: HabitFrequency
  customDays: string[]
  startDate: string
  goalMode: 'Forever' | 'Preset' | 'Custom'
  goalDays: string
  reminderEnabled: boolean
  reminderTime: string
}

function initialState(habit: Habit | undefined, today: string): FormState {
  const isPreset = habit?.goalDays ? goalPresets.includes(habit.goalDays) : false
  return {
    name: habit?.name ?? '',
    description: habit?.description ?? '',
    icon: habit?.icon ?? 'Default',
    frequency: habit?.frequency ?? 'Daily',
    customDays: habit?.customDays ?? [],
    startDate: habit?.startDate ?? today,
    goalMode: !habit?.goalDays ? 'Forever' : isPreset ? 'Preset' : 'Custom',
    goalDays: habit?.goalDays?.toString() ?? '',
    reminderEnabled: habit?.reminderEnabled ?? true,
    reminderTime: habit?.reminderTime ?? '20:00',
  }
}

export function HabitFormDialog({
  habit,
  today,
  timeZoneId,
  isSaving,
  error,
  onClose,
  onSubmit,
}: HabitFormDialogProps) {
  const [form, setForm] = useState(() => initialState(habit, today))
  const [iconMenuOpen, setIconMenuOpen] = useState(false)
  const titleId = useId()
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameInputRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const parsedGoal = form.goalMode === 'Forever' ? null : Number(form.goalDays)
  const goalIsValid = parsedGoal === null
    || (Number.isInteger(parsedGoal)
      && parsedGoal > 0
      && (parsedGoal === habit?.goalDays || parsedGoal > (habit?.totalCheckIns ?? 0)))
  const startDateIsValid = Boolean(habit && !habit.canEditStartDate) || form.startDate >= today
  const canSubmit = form.name.trim().length > 0
    && startDateIsValid
    && goalIsValid
    && (form.frequency === 'Daily' || form.customDays.length > 0)
    && /^([01]\d|2[0-3]):[0-5]\d$/.test(form.reminderTime)

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!canSubmit) return
    onSubmit({
      name: form.name,
      description: form.description.trim() ? form.description : null,
      icon: form.icon,
      frequency: form.frequency,
      customDays: form.frequency === 'Custom' ? form.customDays : null,
      reminderEnabled: form.reminderEnabled,
      startDate: form.startDate,
      goalDays: parsedGoal,
      reminderTime: form.reminderTime,
      timeZoneId,
    })
  }

  function toggleCustomDay(day: string) {
    setForm((current) => ({
      ...current,
      customDays: current.customDays.includes(day)
        ? current.customDays.filter((item) => item !== day)
        : [...current.customDays, day],
    }))
  }

  return (
    <div className="habit-modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="habit-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="habit-modal-header">
          <h3 id={titleId}>{habit ? 'Edit Habit' : 'Create Habit'}</h3>
          <button type="button" aria-label="Close habit dialog" onClick={onClose}><X size={22} /></button>
        </div>
        <form className="habit-modal-form" onSubmit={submit}>
          <label>
            Habit Name
            <input ref={nameInputRef} data-testid="habit-name-input" maxLength={180} required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Read a book" />
          </label>
          <label>
            Description
            <textarea data-testid="habit-description-input" maxLength={2000} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="30 minutes every day" />
          </label>

          <div className="habit-icon-field">
            <span>Icon</span>
            <div className="habit-icon-select">
              <button type="button" className="habit-icon-select-trigger" aria-haspopup="listbox" aria-expanded={iconMenuOpen} aria-label="Habit icon" onClick={() => setIconMenuOpen((open) => !open)}>
                <HabitIconGlyph icon={form.icon} size={18} />
                <span>{form.icon}</span>
                <ChevronRight className={iconMenuOpen ? 'open' : ''} size={17} />
              </button>
              {iconMenuOpen ? (
                <div className="habit-icon-options" role="listbox" aria-label="Habit icon">
                  {habitIconOptions.map((option) => (
                    <button type="button" role="option" aria-selected={form.icon === option.value} key={option.value} onClick={() => { setForm((current) => ({ ...current, icon: option.value })); setIconMenuOpen(false) }}>
                      <HabitIconGlyph icon={option.value} size={18} /><span>{option.label}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <label>
            Frequency
            <select value={form.frequency} onChange={(event) => setForm((current) => ({ ...current, frequency: event.target.value as HabitFrequency }))}>
              <option value="Daily">Every day</option>
              <option value="Custom">Custom days</option>
            </select>
          </label>
          {form.frequency === 'Custom' ? (
            <div className="habit-weekdays-toggle" aria-label="Scheduled weekdays">
              {weekdays.map((day) => (
                <button type="button" aria-pressed={form.customDays.includes(day)} key={day} onClick={() => toggleCustomDay(day)} className={form.customDays.includes(day) ? 'active' : ''}>{day.slice(0, 3)}</button>
              ))}
            </div>
          ) : null}

          <label>
            Start Date
            <input type="date" data-testid="habit-start-date-input" min={today} disabled={Boolean(habit && !habit.canEditStartDate)} value={form.startDate} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} />
            {habit && !habit.canEditStartDate ? <small>Start Date is locked after the first check-in.</small> : null}
          </label>

          <label>
            Goal Days
            <select
              data-testid="habit-goal-days-select"
              value={form.goalMode === 'Forever' ? 'Forever' : form.goalMode === 'Custom' ? 'Custom' : form.goalDays}
              onChange={(event) => {
                const value = event.target.value
                setForm((current) => value === 'Forever'
                  ? { ...current, goalMode: 'Forever', goalDays: '' }
                  : value === 'Custom'
                    ? { ...current, goalMode: 'Custom', goalDays: current.goalMode === 'Custom' ? current.goalDays : '' }
                    : { ...current, goalMode: 'Preset', goalDays: value })
              }}
            >
              <option value="Forever">Forever</option>
              {goalPresets.map((goal) => <option key={goal} value={goal}>{goal} days</option>)}
              <option value="Custom">Custom</option>
            </select>
          </label>
          {form.goalMode === 'Custom' ? (
            <label>
              Custom Goal Days
              <input type="number" min={1} step={1} data-testid="habit-custom-goal-input" value={form.goalDays} onChange={(event) => setForm((current) => ({ ...current, goalDays: event.target.value }))} />
              {!goalIsValid ? <small>A changed goal must be greater than the current {habit?.totalCheckIns ?? 0} check-ins.</small> : null}
            </label>
          ) : null}

          <label className="habit-reminder-toggle">
            <input type="checkbox" checked={form.reminderEnabled} onChange={(event) => setForm((current) => ({ ...current, reminderEnabled: event.target.checked }))} />
            <span>Reminder</span>
          </label>
          {form.reminderEnabled ? (
            <label>
              Reminder Time <small>Asia/Ho_Chi_Minh</small>
              <input type="time" data-testid="habit-reminder-time-input" step={60} required value={form.reminderTime} onChange={(event) => setForm((current) => ({ ...current, reminderTime: event.target.value }))} />
            </label>
          ) : null}

          {error ? <p className="habit-form-error" role="alert">{error}</p> : null}
          <div className="habit-modal-footer">
            <button type="button" className="habit-btn-cancel" onClick={onClose}>Cancel</button>
            <button data-testid="save-habit-button" type="submit" className="habit-btn-submit" disabled={!canSubmit || isSaving}>{isSaving ? 'Saving...' : habit ? 'Save Changes' : 'Create Habit'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
