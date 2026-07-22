import { CheckCircle2, ChevronLeft, ChevronRight, Edit3, Flame, Percent, Trash2, Trophy } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Habit } from '../api/habit.api'
import { canToggleHabit, formatMonth, formatShortDate, parseMonth, scheduleText } from '../habit-date'
import { HabitIconGlyph } from './habit-icons'

type HabitDetailsPanelProps = {
  habit: Habit
  completedDates: Set<string>
  dates: string[]
  selectedMonth: string
  today: string
  isToggling: boolean
  onPreviousMonth: () => void
  onNextMonth: () => void
  onToggle: (date: string) => void
  onEdit: () => void
  onDelete: () => void
}

export function HabitDetailsPanel({
  habit,
  completedDates,
  dates,
  selectedMonth,
  today,
  isToggling,
  onPreviousMonth,
  onNextMonth,
  onToggle,
  onEdit,
  onDelete,
}: HabitDetailsPanelProps) {
  const goalProgress = habit.goalDays
    ? Math.min(100, Math.round((habit.totalCheckIns / habit.goalDays) * 100))
    : 0

  return (
    <div className="habit-tracker-details-inner">
      <header className="habit-details-header">
        <div className="habit-details-title-area">
          <div className="habit-details-icon"><HabitIconGlyph icon={habit.icon} size={34} /></div>
          <div className="habit-details-text">
            <h3>{habit.name}</h3>
            <p>{scheduleText(habit)} · Starts {formatShortDate(habit.startDate)}</p>
          </div>
        </div>
        <div className="habit-details-actions">
          <button type="button" aria-label={`Edit ${habit.name}`} onClick={onEdit}><Edit3 size={20} /></button>
          <button type="button" aria-label={`Delete ${habit.name}`} className="danger" onClick={onDelete}><Trash2 size={20} /></button>
        </div>
      </header>

      <section className="habit-stats-grid" aria-label="Habit statistics">
        <StatCard icon={<CheckCircle2 size={18} className="icon-primary" />} label="Check-ins" accessibleLabel="Total check-ins" value={habit.totalCheckIns} suffix="Days" />
        <StatCard icon={<Percent size={18} className="icon-primary" />} label="Monthly rate" accessibleLabel="Monthly check-in rate" value={Math.round(habit.monthlyCompletionRate)} suffix="%" />
        <StatCard icon={<Flame size={18} className="icon-orange" />} label="Streak" accessibleLabel="Current streak" value={habit.currentStreak} suffix="Days" />
        <StatCard icon={<Trophy size={18} className="icon-purple" />} label="Best streak" accessibleLabel="Longest streak" value={habit.longestStreak} suffix="Days" />
      </section>

      {habit.goalDays ? (
        <section className="habit-goal-card" aria-label={`Goal progress ${habit.totalCheckIns} of ${habit.goalDays}`}>
          <div>
            <strong>{habit.totalCheckIns}/{habit.goalDays}</strong>
            <span>{habit.remainingGoalDays} days left</span>
          </div>
          <div className="habit-goal-track" aria-hidden="true">
            <span style={{ width: `${goalProgress}%` }} />
          </div>
          {habit.isGoalCompleted ? <p>Goal complete · uncheck an earlier day to reactivate it.</p> : null}
        </section>
      ) : null}

      {habit.description ? (
        <section className="habit-description-card" aria-label="Habit description">
          <h4>Description</h4>
          <p>{habit.description}</p>
        </section>
      ) : null}

      <section className="habit-calendar-card" aria-label={`${habit.name} calendar for ${formatMonth(selectedMonth)}`}>
        <div className="habit-calendar-header">
          <button type="button" onClick={onPreviousMonth} aria-label="Previous month"><ChevronLeft size={20} /></button>
          <h4>{formatMonth(selectedMonth)}</h4>
          <button type="button" onClick={onNextMonth} aria-label="Next month"><ChevronRight size={20} /></button>
        </div>
        <div className="habit-calendar-grid">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <div key={day} className="habit-calendar-day-header">{day}</div>
          ))}
          {Array.from({ length: (parseMonth(selectedMonth).getDay() + 6) % 7 }).map((_, index) => (
            <div key={`empty-${index}`} aria-hidden="true" />
          ))}
          {dates.map((date) => {
            const isCompleted = completedDates.has(date)
            const canToggle = canToggleHabit(habit, date, today, isCompleted)
            return (
              <div key={date} className="habit-calendar-day-cell">
                <button
                  type="button"
                  aria-label={`${isCompleted ? 'Uncheck' : 'Check'} ${habit.name} on ${date}`}
                  onClick={() => onToggle(date)}
                  disabled={!canToggle || isToggling}
                  className={`habit-calendar-day-btn ${isCompleted ? 'completed' : ''} ${date === today ? 'today' : ''} ${!canToggle ? 'disabled' : ''}`}
                >
                  {Number(date.slice(-2))}
                </button>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function StatCard({ icon, label, accessibleLabel = label, value, suffix }: { icon: ReactNode; label: string; accessibleLabel?: string; value: number; suffix: string }) {
  return (
    <article className="habit-stat-card" aria-label={`${accessibleLabel}: ${value} ${suffix}`}>
      <div className="habit-stat-label">{icon}<span>{label}</span></div>
      <p className="habit-stat-value">{value} <span>{suffix}</span></p>
    </article>
  )
}
