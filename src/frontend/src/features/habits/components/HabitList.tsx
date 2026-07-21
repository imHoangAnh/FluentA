import { CalendarClock, CheckCircle2, Circle, Flame } from 'lucide-react'
import type { Habit } from '../api/habit.api'
import { canToggleHabit, formatShortDate, isScheduled } from '../habit-date'
import { HabitIconGlyph } from './habit-icons'

type HabitListProps = {
  habits: Habit[]
  entriesByHabit: Map<string, Set<string>>
  selectedHabitId?: string
  selectedDate: string
  today: string
  isLoading: boolean
  isToggling: boolean
  onSelect: (habitId: string) => void
  onToggle: (habitId: string, date: string) => void
}

export function HabitList({
  habits,
  entriesByHabit,
  selectedHabitId,
  selectedDate,
  today,
  isLoading,
  isToggling,
  onSelect,
  onToggle,
}: HabitListProps) {
  return (
    <div className="habit-tracker-list">
      {isLoading ? <p className="habit-tracker-loading" role="status">Loading habits...</p> : null}
      {!isLoading && habits.length === 0 ? (
        <div className="habit-tracker-empty">
          <CalendarClock size={40} />
          <p>No habits yet. Let&apos;s build a new one!</p>
        </div>
      ) : null}

      {habits.map((habit) => {
        const isSelected = selectedHabitId === habit.id
        const completed = entriesByHabit.get(habit.id)?.has(selectedDate) ?? false
        const canToggle = canToggleHabit(habit, selectedDate, today, completed)
        const action = completed ? 'Uncheck' : 'Check'
        const status = selectedDate < habit.startDate
          ? `Starts on ${formatShortDate(habit.startDate)}`
          : habit.isGoalCompleted && !completed
            ? 'Goal complete'
            : !isScheduled(habit, selectedDate)
              ? 'Not scheduled'
              : null

        return (
          <article key={habit.id} className={`habit-list-card ${isSelected ? 'active' : ''}`}>
            <button
              type="button"
              className="habit-list-card-select"
              aria-label={`Select ${habit.name}`}
              aria-pressed={isSelected}
              onClick={() => onSelect(habit.id)}
            >
              <span className="habit-list-card-icon"><HabitIconGlyph icon={habit.icon} size={22} /></span>
              <span className="habit-list-card-info">
                <span className="habit-list-card-name">{habit.name}</span>
                <span className="habit-list-card-streak" aria-label={`${habit.currentStreak} day current streak`}>
                  <Flame size={14} /> {habit.currentStreak} day streak
                </span>
                {status ? <span className="habit-list-card-status">{status}</span> : null}
              </span>
            </button>
            <button
              type="button"
              className={`habit-list-card-toggle ${completed ? 'completed' : ''}`}
              disabled={!canToggle || isToggling}
              aria-label={`${action} ${habit.name} for selected date ${selectedDate}`}
              onClick={() => onToggle(habit.id, selectedDate)}
            >
              {completed ? <CheckCircle2 size={21} /> : <Circle size={21} />}
            </button>
          </article>
        )
      })}
    </div>
  )
}
