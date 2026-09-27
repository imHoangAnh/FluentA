import { apiClient, logoutCurrentSession } from '@/shared/api/client'
import type { ApiEnvelope } from '@/shared/api/contracts'
import axios from 'axios'

export type AuthUser = {
  id: string
  fullName: string
  avatarUrl: string | null
}

/** Full profile returned by the existing settings/profile API, never by /auth/me. */
export type UserProfile = {
  id: string
  email: string
  fullName: string
  isEmailVerified: boolean
  bio?: string | null
  avatarAssetId?: string | null
  avatarDownloadUrl?: string | null
  avatarDownloadUrlExpiresAtUtc?: string | null
}

export type VerificationRequired = {
  nextStep: 'VERIFY_EMAIL'
  email: string
  verificationExpiresAtUtc: string | null
  message?: string
}

export type RegisterPayload = VerificationRequired & { verificationExpiresAtUtc: string }
export type ResendVerificationPayload = {
  email: string
  verificationExpiresAtUtc: string
  message: string
}
export type RegisteredPayload = { nextStep: 'REGISTERED'; email?: string; message?: string }
export type AuthenticatedPayload = {
  nextStep: 'AUTHENTICATED'
  user: AuthUser
  accessTokenExpiresAtUtc: string
}
export type AuthenticationResult = AuthenticatedPayload | VerificationRequired
export type ForgotPasswordPayload = { message: string }
export type ResetPasswordPayload = { nextStep: 'LOGIN'; message: string }

export function getAuthApiError(error: unknown, fallback = 'Something went wrong.') {
  if (!axios.isAxiosError(error)) return { message: fallback, retryAfterSeconds: null as number | null }

  const envelope = error.response?.data as {
    error?: { message?: string; details?: { retryAfterSeconds?: number | string } }
  } | undefined
  const rawRetryAfter = envelope?.error?.details?.retryAfterSeconds
    ?? error.response?.headers?.['retry-after']
  let retryAfterSeconds: number | null = null
  if (typeof rawRetryAfter === 'number' || (typeof rawRetryAfter === 'string' && /^\d+(\.\d+)?$/.test(rawRetryAfter))) {
    const seconds = Number(rawRetryAfter)
    if (Number.isFinite(seconds) && seconds > 0) retryAfterSeconds = Math.ceil(seconds)
  } else if (typeof rawRetryAfter === 'string') {
    const retryDate = Date.parse(rawRetryAfter)
    if (Number.isFinite(retryDate)) retryAfterSeconds = Math.max(1, Math.ceil((retryDate - Date.now()) / 1000))
  }

  const message = envelope?.error?.message ?? fallback
  return {
    message: retryAfterSeconds && error.response?.status === 429
      ? `${message} Please try again in ${retryAfterSeconds} seconds.`
      : message,
    retryAfterSeconds: error.response?.status === 429 ? retryAfterSeconds : null,
  }
}

export async function registerAccount(input: { email: string; password: string; fullName: string }) {
  const response = await apiClient.post<ApiEnvelope<RegisterPayload>>('/auth/register', input)
  return response.data.data!
}

export async function verifyOtp(input: { email: string; otp: string }) {
  const response = await apiClient.post<ApiEnvelope<RegisteredPayload>>('/auth/verify-otp', input)
  return response.data.data!
}

export async function resendVerificationOtp(input: { email: string }) {
  const response = await apiClient.post<ApiEnvelope<ResendVerificationPayload>>('/auth/resend-verification-otp', input)
  return response.data.data!
}

export async function login(input: { email: string; password: string }) {
  const response = await apiClient.post<ApiEnvelope<AuthenticationResult>>('/auth/login', input)
  return response.data.data!
}

export async function googleLogin(input: { idToken: string }) {
  const response = await apiClient.post<ApiEnvelope<AuthenticationResult>>('/auth/google', input)
  return response.data.data!
}

export async function logout() {
  await logoutCurrentSession()
}

export async function me() {
  const response = await apiClient.get<ApiEnvelope<AuthUser>>('/auth/me')
  return response.data.data!
}

export async function forgotPassword(input: { email: string }) {
  const response = await apiClient.post<ApiEnvelope<ForgotPasswordPayload>>('/auth/forgot-password', input)
  return response.data.data!
}

export async function resetPassword(input: { token: string; newPassword: string }) {
  const response = await apiClient.post<ApiEnvelope<ResetPasswordPayload>>('/auth/reset-password', input)
  return response.data.data!
}
