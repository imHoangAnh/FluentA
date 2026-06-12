import { apiClient } from './client'
import type { ApiEnvelope } from './auth.api'

export type PomodoroConfig = {
  id: string
  workMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  longBreakAfter: number
  createdAt: string
  updatedAt: string
}

export type PomodoroCurrentState = {
  state: 'Idle' | 'Running' | 'Paused' | 'Completed'
  phase: 'Work' | 'ShortBreak' | 'LongBreak'
  remainingSeconds: number
  durationSeconds: number
  startedAt?: string | null
  pausedAt?: string | null
  linkedTaskId?: string | null
  linkedTaskSource?: string | null
}

export type UpdatePomodoroConfigInput = {
  workMinutes?: number
  shortBreakMinutes?: number
  longBreakMinutes?: number
  longBreakAfter?: number
}

export type PomodoroToday = {
  completedWorkSessions: number
}

export type StartPomodoroInput = {
  linkedTaskId?: string | null
  linkedTaskSource?: 'todo' | 'kanban' | null
}

export async function getPomodoroConfig() {
  const response = await apiClient.get<ApiEnvelope<PomodoroConfig>>('/pomodoro/config')
  return response.data.data!
}

export async function updatePomodoroConfig(input: UpdatePomodoroConfigInput) {
  const response = await apiClient.patch<ApiEnvelope<PomodoroConfig>>('/pomodoro/config', input)
  return response.data.data!
}

export async function getPomodoroCurrent() {
  const response = await apiClient.get<ApiEnvelope<PomodoroCurrentState>>('/pomodoro/current')
  return response.data.data!
}

export async function getPomodoroToday() {
  const utcOffsetMinutes = -new Date().getTimezoneOffset()
  const response = await apiClient.get<ApiEnvelope<PomodoroToday>>('/pomodoro/today', { params: { utcOffsetMinutes } })
  return response.data.data!
}

async function mutatePomodoroState(action: 'start' | 'pause' | 'resume' | 'reset' | 'complete', input?: StartPomodoroInput) {
  const response = await apiClient.post<ApiEnvelope<PomodoroCurrentState>>(`/pomodoro/${action}`, input)
  return response.data.data!
}

export const startPomodoro = (input: StartPomodoroInput = {}) => mutatePomodoroState('start', input)
export const pausePomodoro = () => mutatePomodoroState('pause')
export const resumePomodoro = () => mutatePomodoroState('resume')
export const resetPomodoro = () => mutatePomodoroState('reset')
export const completePomodoro = () => mutatePomodoroState('complete')
