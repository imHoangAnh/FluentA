import { formatDateOnly } from '@/shared/lib/date'
import { cn } from '@/shared/lib/utils'
import type { StudyConsistencyDay } from '../api/analytics.api'

type StudyConsistencyCardProps = {
  days: StudyConsistencyDay[]
}

const INTENSITY_LEVELS = [0, 1, 2, 3, 4] as const

export function StudyConsistencyCard({ days }: StudyConsistencyCardProps) {
  return (
    <section className="analytics-card" aria-labelledby="study-consistency-heading">
      <div className="analytics-card__header">
        <h2 id="study-consistency-heading" className="analytics-card__title">
          12-Week Study Consistency
        </h2>
        <div className="analytics-consistency-legend" aria-label="Activity intensity legend">
          <span>Less</span>
          {INTENSITY_LEVELS.map((level) => (
            <span
              key={level}
              className={cn('analytics-consistency-legend__swatch', `analytics-intensity--${level}`)}
              aria-hidden="true"
            />
          ))}
          <span>More</span>
        </div>
      </div>

      <div className="analytics-consistency-grid-wrap">
        <div className="analytics-consistency-grid" role="grid" aria-label="Last 84 days of study activity">
          {days.map((day) => {
            const clampedLevel = Math.min(4, Math.max(0, day.intensityLevel))
            const formattedDate = formatDateOnly(day.date, { month: 'short', day: 'numeric', year: 'numeric' })
            const activityLabel = `${day.activityCount} ${day.activityCount === 1 ? 'activity' : 'activities'}`
            const tooltip = `${formattedDate}: ${activityLabel}`

            return (
              <div
                key={day.date}
                role="gridcell"
                title={tooltip}
                aria-label={tooltip}
                className={cn('analytics-consistency-cell', `analytics-intensity--${clampedLevel}`)}
              />
            )
          })}
        </div>
      </div>
    </section>
  )
}
