import type { WeakPhoneme } from '../api/analytics.api'

type PhonemesPracticeCardProps = {
  phonemes: WeakPhoneme[]
}

function getAccuracyColor(accuracyPercent: number) {
  if (accuracyPercent < 60) return '#b42318'
  if (accuracyPercent < 70) return '#b45309'
  return '#0f766e'
}

export function PhonemesPracticeCard({ phonemes }: PhonemesPracticeCardProps) {
  return (
    <section className="analytics-card analytics-card--compact" aria-labelledby="phonemes-heading">
      <h2 id="phonemes-heading" className="analytics-card__title">
        Phonemes Needing Practice
      </h2>
      <p className="analytics-card__subtitle">
        Sounds with the lowest pronunciation accuracy over your last 50 attempts.
      </p>

      {phonemes.length === 0 ? (
        <p className="analytics-empty-note">
          Complete pronunciation exercises in Practice to identify sounds that need extra focus.
        </p>
      ) : (
        <div className="analytics-phoneme-list">
          {phonemes.map((item) => {
            const clampedScore = Math.min(100, Math.max(0, item.accuracyPercent))
            const barColor = getAccuracyColor(clampedScore)

            return (
              <div key={item.phoneme} className="analytics-phoneme-row">
                <div className="analytics-phoneme-row__left">
                  <span className="analytics-phoneme-row__symbol">{item.phoneme}</span>
                  <span className="analytics-phoneme-row__words">
                    {item.exampleWords.join(', ')}
                  </span>
                </div>
                <div className="analytics-phoneme-row__right">
                  <div className="analytics-phoneme-track" aria-hidden="true">
                    <div
                      className="analytics-phoneme-track__fill"
                      style={{ width: `${clampedScore}%`, backgroundColor: barColor }}
                    />
                  </div>
                  <span className="analytics-phoneme-row__score">{`${clampedScore}%`}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
