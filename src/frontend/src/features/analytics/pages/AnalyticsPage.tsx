import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { cn } from '@/shared/lib/utils'
import { type AnalyticsRange, getLearningAnalytics } from '../api/analytics.api'
import { analyticsKeys } from '../api/analytics.queries'
import { AnalyticsKpiRow } from '../components/AnalyticsKpiRow'
import { MasteryLevelsCard } from '../components/MasteryLevelsCard'
import { PhonemesPracticeCard } from '../components/PhonemesPracticeCard'
import { ReviewForecastCard } from '../components/ReviewForecastCard'
import { StudyConsistencyCard } from '../components/StudyConsistencyCard'
import '../analytics.css'

const RANGE_OPTIONS: ReadonlyArray<{ value: AnalyticsRange; label: string }> = [
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: 'all', label: 'All Time' },
]

function AnalyticsLoadingSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading analytics">
      <div className="analytics-kpi-grid">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-[104px] w-full rounded-[12px]" />
        ))}
      </div>
      <div className="analytics-main-grid">
        <div className="analytics-column">
          <Skeleton className="h-[290px] w-full rounded-[14px]" />
          <Skeleton className="h-[221px] w-full rounded-[14px]" />
        </div>
        <div className="analytics-column">
          <Skeleton className="h-[326px] w-full rounded-[14px]" />
          <Skeleton className="h-[200px] w-full rounded-[14px]" />
        </div>
      </div>
    </div>
  )
}

export function AnalyticsPage() {
  const [range, setRange] = useState<AnalyticsRange>('90d')

  const analyticsQuery = useQuery({
    queryKey: analyticsKeys.overview(range),
    queryFn: () => getLearningAnalytics(range),
    placeholderData: keepPreviousData,
  })

  const data = analyticsQuery.data

  return (
    <div className="analytics-shell" aria-busy={analyticsQuery.isFetching}>
      <header className="analytics-header">
        <div className="analytics-header__copy">
          <h2 className="analytics-header__title">Analytics</h2>
          <p className="analytics-header__subtitle">
            Retention health, mastery progression, and speech accuracy across your study sessions.
          </p>
        </div>

        <div className="analytics-range-tabs" role="tablist" aria-label="Analytics time range">
          {RANGE_OPTIONS.map((option) => {
            const isActive = range === option.value
            return (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setRange(option.value)}
                className={cn(
                  'analytics-range-tab',
                  isActive && 'analytics-range-tab--active',
                )}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </header>

      {analyticsQuery.isPending && !data ? <AnalyticsLoadingSkeleton /> : null}

      {analyticsQuery.isError && !data ? (
        <div className="analytics-error-banner" role="alert">
          <p className="analytics-error-banner__text">
            Could not load learning analytics right now.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void analyticsQuery.refetch()}
          >
            Retry
          </Button>
        </div>
      ) : null}

      {data ? (
        <>
          <AnalyticsKpiRow
            retention={data.retention}
            mastery={data.mastery}
            streak={data.streak}
            forecast={data.forecast}
          />

          <div className="analytics-main-grid">
            <div className="analytics-column">
              <MasteryLevelsCard mastery={data.mastery} />
              <StudyConsistencyCard days={data.consistencyDays} />
            </div>
            <div className="analytics-column">
              <PhonemesPracticeCard phonemes={data.weakPhonemes} />
              <ReviewForecastCard buckets={data.forecast.buckets} />
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
