import { ArrowLeft, BarChart3, Home } from 'lucide-react'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import * as habitApi from '../../lib/api/habit.api'
import { HabitIconGlyph } from '../../lib/habit-icons'

function browserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

function scheduleText(stats: habitApi.HabitStats) {
  return stats.frequency === 'Daily' ? 'Daily' : stats.customDays.join(', ')
}

function rateText(rate: number) {
  return `${Math.round(rate)}%`
}

export function HabitStatsPage() {
  const { habitId } = useParams()
  const timeZoneId = useMemo(() => browserTimeZone(), [])

  const statsQuery = useQuery({
    queryKey: ['habit', 'stats', habitId, timeZoneId],
    queryFn: () => habitApi.getHabitStats(habitId!, timeZoneId),
    enabled: Boolean(habitId),
  })

  const stats = statsQuery.data

  return (
    <main className="workspace habit-workspace">
      <header className="workspace-header">
        <div className="brand-inline">
          <span className="brand-mark brand-mark--small">FA</span>
          <strong>FluentA</strong>
        </div>
        <nav className="workspace-nav" aria-label="Habit stats navigation">
          <Link className="ghost-button ghost-button--inline" to="/">
            <BarChart3 size={17} /> Dashboard
          </Link>
          <Link className="ghost-button ghost-button--inline" to="/habits">
            <ArrowLeft size={17} /> Habits
          </Link>
          <Link className="ghost-button ghost-button--inline" to="/vocabulary">
            <Home size={17} /> Vocabulary
          </Link>
        </nav>
      </header>

      <section className="habit-shell">
        <div className="habit-hero">
          <div>
            <span className="preview-label">Habit Stats</span>
            <h1>{stats?.name ?? 'Habit statistics'}</h1>
            <p>{stats ? `${scheduleText(stats)} · as of ${stats.asOfDate} · ${timeZoneId}` : timeZoneId}</p>
          </div>
          <BarChart3 size={34} />
        </div>

        {statsQuery.isLoading ? <p className="flashcard-status">Loading habit stats...</p> : null}
        {statsQuery.isError ? <p className="flashcard-status flashcard-status--error">Could not load habit stats.</p> : null}

        {stats ? (
          <>
            <section className="habit-stats-grid" aria-label="Habit statistics">
              <article>
                <span>Current streak</span>
                <strong>{stats.currentStreak} days</strong>
                <small>Uses scheduled days only.</small>
              </article>
              <article>
                <span>Longest streak</span>
                <strong>{stats.longestStreak} days</strong>
                <small>Best historical run.</small>
              </article>
              <article>
                <span>Last 7 days</span>
                <strong>{rateText(stats.last7DaysCompletionRate)}</strong>
                <small>{stats.completedLast7Days}/{stats.scheduledLast7Days} scheduled days complete</small>
              </article>
              <article>
                <span>Last 30 days</span>
                <strong>{rateText(stats.last30DaysCompletionRate)}</strong>
                <small>{stats.completedLast30Days}/{stats.scheduledLast30Days} scheduled days complete</small>
              </article>
            </section>

            <section className="habit-stats-detail" aria-label="Habit schedule details">
              <div>
                <HabitIconGlyph icon={stats.icon} size={24} />
                <div>
                  <h2>{stats.name}</h2>
                  {stats.description ? <p>{stats.description}</p> : null}
                  <p><strong>Schedule:</strong> {scheduleText(stats)}</p>
                </div>
              </div>
              <Link className="primary-button" to="/habits">
                Back to monthly grid
              </Link>
            </section>
          </>
        ) : null}
      </section>
    </main>
  )
}
