import { Check, ChevronLeft, ChevronRight } from 'lucide-react'

export type HabitWeekDay = {
  dateStr: string
  dayName: string
  dayNum: number
  isToday: boolean
}

type DayProgress = {
  completed: number
  eligible: number
}

type HabitWeekStripProps = {
  days: HabitWeekDay[]
  selectedDate: string
  progress: Map<string, DayProgress>
  onSelect: (date: string) => void
  onPrevious: () => void
  onNext: () => void
}

export function HabitWeekStrip({
  days,
  selectedDate,
  progress,
  onSelect,
  onPrevious,
  onNext,
}: HabitWeekStripProps) {
  return (
    <section className="habit-tracker-week" aria-label="Select a habit date">
      <div className="habit-week-navigation">
        <button type="button" onClick={onPrevious} aria-label="Previous week"><ChevronLeft size={18} /></button>
        <strong>{days[0].dateStr} – {days[6].dateStr}</strong>
        <button type="button" onClick={onNext} aria-label="Next week"><ChevronRight size={18} /></button>
      </div>
      <div className="habit-tracker-week-grid">
        {days.map((day) => {
          const dayProgress = progress.get(day.dateStr) ?? { completed: 0, eligible: 0 }
          const percentage = dayProgress.eligible === 0
            ? 0
            : Math.round((dayProgress.completed / dayProgress.eligible) * 100)
          const isComplete = dayProgress.eligible > 0 && dayProgress.completed === dayProgress.eligible
          const isSelected = day.dateStr === selectedDate
          return (
            <button
              type="button"
              key={day.dateStr}
              className={`habit-week-day-button ${isSelected ? 'selected' : ''}`}
              aria-pressed={isSelected}
              aria-label={`${day.dayName} ${day.dateStr}, ${dayProgress.completed} of ${dayProgress.eligible} eligible habits complete`}
              onClick={() => onSelect(day.dateStr)}
            >
              <span className={day.isToday ? 'active' : ''}>{day.dayName}</span>
              <strong>{day.dayNum}</strong>
              <span className="habit-day-progress" aria-hidden="true">
                <svg viewBox="0 0 36 36">
                  <circle className="track" cx="18" cy="18" r="14" pathLength="100" />
                  <circle className="value" cx="18" cy="18" r="14" pathLength="100" strokeDasharray="100" strokeDashoffset={100 - percentage} />
                </svg>
                {isComplete ? <Check size={14} /> : null}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
