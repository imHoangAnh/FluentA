import { apiClient } from '@/shared/lib/http/client'
import type { ApiEnvelope } from '@/shared/types/api'

export type ReviewMode = 'dictation' | 'meaningToWord' | 'pronunciation' | 'random'
export type ReviewOrderType = 'sequential' | 'shuffle'
export type ReviewStartBehavior = 'prompt' | 'continue' | 'replace'
export type ReviewStartDisposition = 'prompt' | 'started' | 'continued'
export type ReviewSessionWord = { wordId: string; word: string; wordClass: string; ipaPronunciation: string; meaningVn: string; meaningEn: string; example: string; thesaurus?: string | null; collocation?: string | null; note?: string | null; mode: ReviewMode | Exclude<ReviewMode, 'random'> }
export type ReviewStartOptions = { hasActiveSameDaySession: boolean; existingSessionId?: string | null; remainingWords: number; requiresDecision: boolean }
export type ReviewSessionCreated = { sessionId: string; boardId: string; boardName: string; orderType: ReviewOrderType; mode: ReviewMode; startDisposition: ReviewStartDisposition; startedAt: string; totalWords: number; startOptions: ReviewStartOptions; words: ReviewSessionWord[] }
export type ReviewSessionSummary = { sessionId: string; totalWordsReviewed: number; correct: number; wrong: number; correctPercent: number; wrongPercent: number; averageTimeSpentSeconds: number }
export type ReviewResult = { wordId: string; reviewHistoryId: string; result: 'correct' | 'wrong'; levelBefore: number; levelAfter: number; lapseCount: number; nextReviewDate: string }
export type DashboardForecastPoint = { date: string; dueCount: number }
export type ReviewDashboard = { boardId?: string | null; boardName?: string | null; totalCards: number; totalReviews: number; streakDays: number; retentionRate: number; overdue: number; dueToday: number; newCards: number; forecast: DashboardForecastPoint[] }

export async function createReviewSession(input: { boardId: string; orderType: ReviewOrderType; mode: ReviewMode; startBehavior: ReviewStartBehavior; timeZoneId: string }) { return (await apiClient.post<ApiEnvelope<ReviewSessionCreated>>('/review/sessions', input)).data.data! }
export async function getReviewSessionSummary(sessionId: string) { return (await apiClient.get<ApiEnvelope<ReviewSessionSummary>>(`/review/sessions/${sessionId}/summary`)).data.data! }
export async function getReviewDashboard(timeZoneId: string, boardId?: string) { const path = boardId ? `/review/dashboard/${boardId}` : '/review/dashboard'; return (await apiClient.get<ApiEnvelope<ReviewDashboard>>(path, { params: { timeZoneId } })).data.data! }
export async function submitReview(input: { sessionId: string; wordId: string; correct: boolean; timeSpentSeconds: number; timeZoneId: string }) { return (await apiClient.post<ApiEnvelope<ReviewResult>>('/review', input)).data.data! }
