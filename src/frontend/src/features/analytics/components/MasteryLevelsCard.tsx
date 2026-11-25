import type { MasteryMetric } from '../api/analytics.api'

type MasteryLevelsCardProps = {
  mastery: MasteryMetric
}

const LEVEL_META: Record<number, { label: string; color: string }> = {
  0: { label: 'Lv 0 New', color: '#cbd7d4' },
  1: { label: 'Lv 1', color: '#99f6e4' },
  2: { label: 'Lv 2', color: '#5eead4' },
  3: { label: 'Lv 3', color: '#2dd4bf' },
  4: { label: 'Lv 4', color: '#14b8a6' },
  5: { label: 'Lv 5 Mastered', color: '#0f766e' },
}

const MAX_BAR_HEIGHT_PX = 142
const MIN_NON_ZERO_BAR_PX = 10

export function MasteryLevelsCard({ mastery }: MasteryLevelsCardProps) {
  const maxCount = Math.max(0, ...mastery.levels.map((item) => item.count))

  return (
    <section className="analytics-card" aria-labelledby="mastery-levels-heading">
      <div className="analytics-card__header">
        <h2 id="mastery-levels-heading" className="analytics-card__title">
          Vocabulary Mastery Levels (SRS 0–5)
        </h2>
        <p className="analytics-card__meta">
          {`${mastery.totalWords} total ${mastery.totalWords === 1 ? 'word' : 'words'}`}
        </p>
      </div>

      {mastery.totalWords === 0 ? (
        <p className="analytics-empty-note">
          No active words enrolled in Review yet. Complete a Practice recap to start tracking SRS levels.
        </p>
      ) : (
        <div className="analytics-mastery-chart" role="list" aria-label="SRS mastery level distribution">
          {mastery.levels.map((item) => {
            const meta = LEVEL_META[item.level] ?? { label: `Lv ${item.level}`, color: '#cbd7d4' }
            const heightPx =
              item.count === 0 || maxCount === 0
                ? 4
                : Math.max(MIN_NON_ZERO_BAR_PX, Math.round((item.count / maxCount) * MAX_BAR_HEIGHT_PX))

            return (
              <div key={item.level} className="analytics-mastery-col" role="listitem">
                <span className="analytics-mastery-col__count">{item.count}</span>
                <div
                  className="analytics-mastery-col__bar"
                  style={{ height: `${heightPx}px`, backgroundColor: meta.color }}
                  aria-label={`${meta.label}: ${item.count} words`}
                />
                <span className="analytics-mastery-col__label">{meta.label}</span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
