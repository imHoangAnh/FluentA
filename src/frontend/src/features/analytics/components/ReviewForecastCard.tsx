import type { ReviewForecastBucket } from '../api/analytics.api'
import { AnalyticsBadge } from './AnalyticsBadge'

type ReviewForecastCardProps = {
  buckets: ReviewForecastBucket[]
}

export function ReviewForecastCard({ buckets }: ReviewForecastCardProps) {
  return (
    <section className="analytics-card analytics-card--compact" aria-labelledby="forecast-heading">
      <h2 id="forecast-heading" className="analytics-card__title">
        7-Day Review Forecast
      </h2>

      <div className="analytics-forecast-list">
        {buckets.map((bucket) => {
          const tone = bucket.key === 'today' && bucket.dueCount > 0 ? 'warning' : 'neutral'
          return (
            <div key={bucket.key} className="analytics-forecast-row">
              <span className="analytics-forecast-row__label">{bucket.label}</span>
              <AnalyticsBadge label={`${bucket.dueCount} due`} tone={tone} />
            </div>
          )
        })}
      </div>
    </section>
  )
}
