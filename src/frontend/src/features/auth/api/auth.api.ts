import { apiClient, rawApiClient } from '@/shared/lib/http/client'
import type { ApiEnvelope } from '@/shared/types/api'

export type UserProfile = {
  id: string
  email: string
  fullName: string
  isEmailVerified: boolean
  bio?: string | null
  avatarUrl?: string | null
  avatarAssetId?: string | null
  avatarDownloadUrl?: string | null
  avatarDownloadUrlExpiresAtUtc?: string | null
}

export type AuthPayload = {
  accessToken: string
  user: UserProfile
}

export type RegisterPayload = {
  message: string
  email: string
  verificationExpiresAtUtc: string
  resendAvailableAtUtc: string
  developmentOtp?: string | null
}

export type ResendVerificationPayload = {
  message: string
  email: string
  verificationExpiresAtUtc: string
  resendAvailableAtUtc: string
  developmentOtp?: string | null
}

export type ForgotPasswordPayload = {
  message: string
  accountExists: boolean
  developmentResetUrl?: string | null
}

export type MessagePayload = {
  message: string
}

export async function registerAccount(input: { email: string; password: string; fullName: string }) {
  const response = await apiClient.post<ApiEnvelope<RegisterPayload>>('/auth/register', input)
  return response.data.data!
}

export async function verifyEmail(input: { email: string; otp: string }) {
  const response = await apiClient.post<ApiEnvelope<UserProfile>>('/auth/verify-email', input)
  return response.data.data!
}

export async function resendVerificationOtp(input: { email: string }) {
  const response = await apiClient.post<ApiEnvelope<ResendVerificationPayload>>('/auth/resend-verification-otp', input)
  return response.data.data!
}

export async function login(input: { email: string; password: string }) {
  const response = await apiClient.post<ApiEnvelope<AuthPayload>>('/auth/login', input)
  return response.data.data!
}

export async function googleLogin(input: { code: string; redirectUri: string }) {
  const response = await apiClient.post<ApiEnvelope<AuthPayload>>('/auth/google', input)
  return response.data.data!
}

export async function refresh() {
  const response = await rawApiClient.post<ApiEnvelope<AuthPayload>>('/auth/refresh')
  return response.data.data!
}

export async function logout() {
  await apiClient.post('/auth/logout')
}

export async function me() {
  const response = await apiClient.get<ApiEnvelope<UserProfile>>('/auth/me')
  return response.data.data!
}

export async function forgotPassword(input: { email: string }) {
  const response = await apiClient.post<ApiEnvelope<ForgotPasswordPayload>>('/auth/forgot-password', input)
  return response.data.data!
}

export async function resetPassword(input: { token: string; password: string; confirmPassword: string }) {
  const response = await apiClient.post<ApiEnvelope<MessagePayload>>('/auth/reset-password', input)
  return response.data.data!
}
