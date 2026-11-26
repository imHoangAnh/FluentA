import { apiClient } from '@/shared/api/client'
import type { ApiResponse } from '@/shared/api/contracts'

export type HabitFrequency = 'Daily' | 'Custom'
export type HabitIcon = 'Default' | 'Book' | 'Exercise' | 'Water' | 'Meditation' | 'Study' | 'Work' | 'Health'

export type Habit = {
  id: string
  name: string
  description?: string | null
  icon: HabitIcon
  frequency: HabitFrequency
  customDays: string[]
  startDate: string
  goalDays: number | null
  currentStreak: number
  longestStreak: number
  totalCheckIns: number
  isScheduledToday: boolean
  isCheckedToday: boolean
  monthlyCompletionRate: number
  isGoalCompleted: boolean
  goalCompletedOn: string | null
  remainingGoalDays: number | null
  canEditStartDate: boolean
  createdAt: string
  updatedAt: string
}

export type HabitEntry = {
  habitId: string
  date: string
  isCompleted: boolean
}

export type HabitEntryToggle = HabitEntry & {
  totalCheckIns: number
  isGoalCompleted: boolean
}

export type CreateHabitInput = {
  name: string
  description?: string | null
  icon?: HabitIcon
  frequency: HabitFrequency
  customDays?: string[] | null
  startDate: string
  goalDays?: number | null
  timeZoneId: string
}

export type UpdateHabitInput = Partial<CreateHabitInput>

export async function listHabits(timeZoneId: string, month?: string) {
  const response = await apiClient.get<ApiResponse<Habit[]>>('/habits', { params: { timeZoneId, month } })
  return response.data.data ?? []
}

export async function createHabit(input: CreateHabitInput) {
  const response = await apiClient.post<ApiResponse<Habit>>('/habits', input)
  return response.data.data!
}

export async function updateHabit(id: string, input: UpdateHabitInput) {
  const response = await apiClient.patch<ApiResponse<Habit>>(`/habits/${id}`, input)
  return response.data.data!
}

export async function deleteHabit(id: string) {
  const response = await apiClient.delete<ApiResponse<{ deleted: boolean }>>(`/habits/${id}`)
  return response.data.data!
}

export async function listHabitEntries(id: string, month: string, timeZoneId: string) {
  const response = await apiClient.get<ApiResponse<HabitEntry[]>>(`/habits/${id}/entries`, { params: { month, timeZoneId } })
  return response.data.data ?? []
}

export async function toggleHabitEntry(id: string, date: string, timeZoneId: string) {
  const response = await apiClient.post<ApiResponse<HabitEntryToggle>>(`/habits/${id}/entries`, { date, timeZoneId })
  return response.data.data!
}
