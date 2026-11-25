import { apiClient } from '@/shared/api/client'
import type { ApiResponse } from '@/shared/api/contracts'

export type AnalyticsRange = '30d' | '90d' | 'all'

export type RetentionMetric = {
  ratePercent: number | null
  deltaPercent: number | null
  totalReviews: number
  correctReviews: number
  priorPeriodDays: number | null
}

export type MasteryLevelCount = {
  level: number
  count: number
}

export type MasteryMetric = {
  masteredCount: number
  totalWords: number
  masteredPercent: number
  levels: MasteryLevelCount[]
}

export type StudyStreak = {
  currentDays: number
  longestDays: number
}

export type ReviewForecastBucket = {
  key: string
  label: string
  startDate: string
  endDate: string
  dueCount: number
}

export type ReviewForecast = {
  totalDueNext7Days: number
  averagePerDay: number
  buckets: ReviewForecastBucket[]
}

export type StudyConsistencyDay = {
  date: string
  activityCount: number
  intensityLevel: number
}

export type WeakPhoneme = {
  phoneme: string
  exampleWords: string[]
  accuracyPercent: number
  attemptCount: number
}

export type LearningAnalytics = {
  range: AnalyticsRange
  localDate: string
  retention: RetentionMetric
  mastery: MasteryMetric
  streak: StudyStreak
  forecast: ReviewForecast
  consistencyDays: StudyConsistencyDay[]
  weakPhonemes: WeakPhoneme[]
}

export async function getLearningAnalytics(range: AnalyticsRange) {
  const response = await apiClient.get<ApiResponse<LearningAnalytics>>('/analytics', {
    params: { range },
  })
  return response.data.data!
}
