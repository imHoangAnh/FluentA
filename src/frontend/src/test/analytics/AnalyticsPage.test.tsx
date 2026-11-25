import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LearningAnalytics } from '@/features/analytics'
import { AnalyticsPage } from '@/features/analytics/pages/AnalyticsPage'
import { renderWithProviders } from '@/test/render'

const apiMocks = vi.hoisted(() => ({
  getLearningAnalytics: vi.fn(),
}))

vi.mock('@/features/analytics/api/analytics.api', async () => {
  const actual = await vi.importActual<typeof import('@/features/analytics/api/analytics.api')>(
    '@/features/analytics/api/analytics.api',
  )
  return {
    ...actual,
    getLearningAnalytics: apiMocks.getLearningAnalytics,
  }
})

function buildSampleAnalytics(overrides: Partial<LearningAnalytics> = {}): LearningAnalytics {
  const start = new Date('2026-09-01T12:00:00Z')
  const consistencyDays = Array.from({ length: 84 }, (_, index) => {
    const date = new Date(start.getTime() + index * 86_400_000).toISOString().slice(0, 10)
    return {
      date,
      activityCount: index % 5 === 0 ? 0 : (index % 4) + 2,
      intensityLevel: index % 5,
    }
  })

  return {
    range: '90d',
    localDate: '2026-11-23',
    retention: {
      ratePercent: 86.4,
      deltaPercent: 4.2,
      totalReviews: 110,
      correctReviews: 95,
      priorPeriodDays: 90,
    },
    mastery: {
      masteredCount: 142,
      totalWords: 248,
      masteredPercent: 57,
      levels: [
        { level: 0, count: 18 },
        { level: 1, count: 26 },
        { level: 2, count: 34 },
        { level: 3, count: 28 },
        { level: 4, count: 64 },
        { level: 5, count: 78 },
      ],
    },
    streak: {
      currentDays: 14,
      longestDays: 21,
    },
    forecast: {
      totalDueNext7Days: 34,
      averagePerDay: 4.9,
      buckets: [
        { key: 'today', label: 'Today', startDate: '2026-11-23', endDate: '2026-11-23', dueCount: 12 },
        { key: 'tomorrow', label: 'Tomorrow', startDate: '2026-11-24', endDate: '2026-11-24', dueCount: 8 },
        { key: 'mid', label: 'Wed – Fri', startDate: '2026-11-25', endDate: '2026-11-27', dueCount: 11 },
        { key: 'end', label: 'Weekend', startDate: '2026-11-28', endDate: '2026-11-29', dueCount: 3 },
      ],
    },
    consistencyDays,
    weakPhonemes: [
      { phoneme: '/ei/', exampleWords: ['gate', 'scale', 'wait'], accuracyPercent: 54, attemptCount: 9 },
      { phoneme: '/th/', exampleWords: ['think', 'depth', 'path'], accuracyPercent: 61, attemptCount: 7 },
      { phoneme: '/dh/', exampleWords: ['although', 'thus'], accuracyPercent: 66, attemptCount: 5 },
      { phoneme: '/r/', exampleWords: ['resilient', 'craft'], accuracyPercent: 74, attemptCount: 6 },
    ],
    ...overrides,
  }
}

describe('AnalyticsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders KPI cards, mastery bars, 84 consistency cells, phonemes, and 7-day forecast', async () => {
    apiMocks.getLearningAnalytics.mockResolvedValue(buildSampleAnalytics())

    renderWithProviders(<AnalyticsPage />)

    expect(await screen.findByText('86.4%')).toBeInTheDocument()
    expect(screen.getByText('+4.2% vs prior 90d')).toBeInTheDocument()
    expect(screen.getByText('142 / 248')).toBeInTheDocument()
    expect(screen.getByText('57% at Lv 4–5')).toBeInTheDocument()
    expect(screen.getByText('14 days')).toBeInTheDocument()
    expect(screen.getByText('Longest: 21 days')).toBeInTheDocument()
    expect(screen.getByText('34 words')).toBeInTheDocument()
    expect(screen.getByText('Avg 4.9 / day')).toBeInTheDocument()

    expect(screen.getByText('248 total words')).toBeInTheDocument()
    expect(screen.getByText('Lv 0 New')).toBeInTheDocument()
    expect(screen.getByText('Lv 5 Mastered')).toBeInTheDocument()

    const grid = screen.getByRole('grid', { name: 'Last 84 days of study activity' })
    expect(within(grid).getAllByRole('gridcell')).toHaveLength(84)

    expect(screen.getByText('/ei/')).toBeInTheDocument()
    expect(screen.getByText('gate, scale, wait')).toBeInTheDocument()
    expect(screen.getByText('54%')).toBeInTheDocument()

    expect(screen.getByText('Today')).toBeInTheDocument()
    expect(screen.getByText('12 due')).toBeInTheDocument()
    expect(screen.getByText('Wed – Fri')).toBeInTheDocument()
    expect(screen.getByText('Weekend')).toBeInTheDocument()

    expect(apiMocks.getLearningAnalytics).toHaveBeenCalledWith('90d')
  })

  it('switches time ranges and refetches analytics', async () => {
    apiMocks.getLearningAnalytics.mockImplementation(async (range: '30d' | '90d' | 'all') =>
      buildSampleAnalytics({
        range,
        retention: {
          ratePercent: range === '30d' ? 91.0 : range === 'all' ? 84.0 : 86.4,
          deltaPercent: range === 'all' ? null : 2.5,
          totalReviews: 40,
          correctReviews: 36,
          priorPeriodDays: range === 'all' ? null : range === '30d' ? 30 : 90,
        },
      }),
    )

    renderWithProviders(<AnalyticsPage />)
    expect(await screen.findByText('86.4%')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: '30 Days' }))
    await waitFor(() => expect(apiMocks.getLearningAnalytics).toHaveBeenCalledWith('30d'))
    expect(await screen.findByText('91.0%')).toBeInTheDocument()
    expect(screen.getByText('+2.5% vs prior 30d')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'All Time' }))
    await waitFor(() => expect(apiMocks.getLearningAnalytics).toHaveBeenCalledWith('all'))
    expect(await screen.findByText('84.0%')).toBeInTheDocument()
    expect(screen.getByText('40 reviews')).toBeInTheDocument()
  })

  it('renders clean empty states when user has no activity yet', async () => {
    apiMocks.getLearningAnalytics.mockResolvedValue(
      buildSampleAnalytics({
        retention: { ratePercent: null, deltaPercent: null, totalReviews: 0, correctReviews: 0, priorPeriodDays: 90 },
        mastery: {
          masteredCount: 0,
          totalWords: 0,
          masteredPercent: 0,
          levels: [0, 1, 2, 3, 4, 5].map((level) => ({ level, count: 0 })),
        },
        streak: { currentDays: 0, longestDays: 0 },
        forecast: {
          totalDueNext7Days: 0,
          averagePerDay: 0,
          buckets: [
            { key: 'today', label: 'Today', startDate: '2026-11-23', endDate: '2026-11-23', dueCount: 0 },
            { key: 'tomorrow', label: 'Tomorrow', startDate: '2026-11-24', endDate: '2026-11-24', dueCount: 0 },
            { key: 'mid', label: 'Wed – Fri', startDate: '2026-11-25', endDate: '2026-11-27', dueCount: 0 },
            { key: 'end', label: 'Weekend', startDate: '2026-11-28', endDate: '2026-11-29', dueCount: 0 },
          ],
        },
        weakPhonemes: [],
      }),
    )

    renderWithProviders(<AnalyticsPage />)

    expect(await screen.findByText('—')).toBeInTheDocument()
    expect(screen.getByText('No reviews yet')).toBeInTheDocument()
    expect(screen.getByText('0 / 0')).toBeInTheDocument()
    expect(screen.getByText(/No active words enrolled in Review yet/i)).toBeInTheDocument()
    expect(screen.getByText(/Complete pronunciation exercises in Practice/i)).toBeInTheDocument()
  })

  it('shows error banner and retries when loading fails', async () => {
    apiMocks.getLearningAnalytics
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(buildSampleAnalytics())

    renderWithProviders(<AnalyticsPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load learning analytics right now.')
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

    expect(await screen.findByText('86.4%')).toBeInTheDocument()
    expect(apiMocks.getLearningAnalytics).toHaveBeenCalledTimes(2)
  })
})
