import { apiClient } from '@/shared/api/client'
import type { ApiEnvelope } from '@/shared/api/contracts'

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

export type RegisterPayload = {
  message: string
  email: string
  verificationExpiresAtUtc: string
  resendAvailableAtUtc: string
}

export type ResendVerificationPayload = RegisterPayload
export type ForgotPasswordPayload = { message: string }
export type MessagePayload = { message: string }

export async function registerAccount(input: { email: string; password: string; fullName: string }) {
  const response = await apiClient.post<ApiEnvelope<RegisterPayload>>('/auth/register', input)
  return response.data.data!
}

export async function verifyOtp(input: { email: string; otp: string }) {
  const response = await apiClient.post<ApiEnvelope<UserProfile>>('/auth/verify-otp', input)
  return response.data.data!
}

export async function resendVerificationOtp(input: { email: string }) {
  const response = await apiClient.post<ApiEnvelope<ResendVerificationPayload>>('/auth/resend-verification-otp', input)
  return response.data.data!
}

export async function login(input: { email: string; password: string }) {
  const response = await apiClient.post<ApiEnvelope<UserProfile>>('/auth/login', input)
  return response.data.data!
}

export async function googleLogin(input: { idToken: string }) {
  const response = await apiClient.post<ApiEnvelope<UserProfile>>('/auth/google-login', input)
  return response.data.data!
}

export async function logout() { await apiClient.post('/auth/logout') }

export async function me() {
  const response = await apiClient.get<ApiEnvelope<UserProfile>>('/auth/me')
  return response.data.data!
}

export async function forgotPassword(input: { email: string }) {
  const response = await apiClient.post<ApiEnvelope<ForgotPasswordPayload>>('/auth/forgot-password', input)
  return response.data.data!
}

export async function resetPassword(input: { token: string; newPassword: string }) {
  const response = await apiClient.post<ApiEnvelope<MessagePayload>>('/auth/reset-password', input)
  return response.data.data!
}
