import type { MasteryMetric, RetentionMetric, ReviewForecast, StudyStreak } from '../api/analytics.api'
import { AnalyticsBadge, type AnalyticsBadgeTone } from './AnalyticsBadge'

type AnalyticsKpiRowProps = {
  retention: RetentionMetric
  mastery: MasteryMetric
  streak: StudyStreak
  forecast: ReviewForecast
}

function formatCountLabel(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`
}

function getRetentionBadge(retention: RetentionMetric): { label: string; tone: AnalyticsBadgeTone } {
  if (retention.deltaPercent !== null && retention.priorPeriodDays !== null) {
    const sign = retention.deltaPercent > 0 ? '+' : ''
    const tone: AnalyticsBadgeTone =
      retention.deltaPercent > 0 ? 'success' : retention.deltaPercent < 0 ? 'danger' : 'neutral'
    return {
      label: `${sign}${retention.deltaPercent.toFixed(1)}% vs prior ${retention.priorPeriodDays}d`,
      tone,
    }
  }

  if (retention.totalReviews > 0) {
    return {
      label: formatCountLabel(retention.totalReviews, 'review', 'reviews'),
      tone: 'neutral',
    }
  }

  return { label: 'No reviews yet', tone: 'neutral' }
}

function formatAveragePerDay(averagePerDay: number) {
  return Number.isInteger(averagePerDay) ? String(averagePerDay) : averagePerDay.toFixed(1)
}

export function AnalyticsKpiRow({ retention, mastery, streak, forecast }: AnalyticsKpiRowProps) {
  const retentionBadge = getRetentionBadge(retention)
  const retentionValue = retention.ratePercent !== null ? `${retention.ratePercent.toFixed(1)}%` : '—'

  return (
    <section className="analytics-kpi-grid" aria-label="Learning summary metrics">
      <article className="analytics-kpi-card">
        <div className="analytics-kpi-card__top">
          <h2 className="analytics-kpi-card__label">Retention Rate</h2>
          <AnalyticsBadge label={retentionBadge.label} tone={retentionBadge.tone} />
        </div>
        <p className="analytics-kpi-card__value">{retentionValue}</p>
      </article>

      <article className="analytics-kpi-card">
        <div className="analytics-kpi-card__top">
          <h2 className="analytics-kpi-card__label">Mastered Words</h2>
          <AnalyticsBadge label={`${mastery.masteredPercent}% at Lv 4–5`} tone="primary" />
        </div>
        <p className="analytics-kpi-card__value">{`${mastery.masteredCount} / ${mastery.totalWords}`}</p>
      </article>

      <article className="analytics-kpi-card">
        <div className="analytics-kpi-card__top">
          <h2 className="analytics-kpi-card__label">Study Streak</h2>
          <AnalyticsBadge
            label={`Longest: ${formatCountLabel(streak.longestDays, 'day', 'days')}`}
            tone={streak.currentDays > 0 ? 'success' : 'neutral'}
          />
        </div>
        <p className="analytics-kpi-card__value">{formatCountLabel(streak.currentDays, 'day', 'days')}</p>
      </article>

      <article className="analytics-kpi-card">
        <div className="analytics-kpi-card__top">
          <h2 className="analytics-kpi-card__label">Due Next 7 Days</h2>
          <AnalyticsBadge label={`Avg ${formatAveragePerDay(forecast.averagePerDay)} / day`} tone="warning" />
        </div>
        <p className="analytics-kpi-card__value">{formatCountLabel(forecast.totalDueNext7Days, 'word', 'words')}</p>
      </article>
    </section>
  )
}
