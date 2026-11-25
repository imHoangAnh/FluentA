import type { AnalyticsRange } from './analytics.api'

export const analyticsKeys = {
  all: ['analytics'] as const,
  overview: (range: AnalyticsRange) => ['analytics', 'overview', range] as const,
}
