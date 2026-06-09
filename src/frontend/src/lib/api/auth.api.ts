import { apiClient, rawApiClient } from './client'

export type UserProfile = {
  id: string
  email: string
  fullName: string
  isEmailVerified: boolean
}

export type AuthPayload = {
  accessToken: string
  user: UserProfile
}

export type ApiEnvelope<T> = {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: Record<string, string[]>
  }
}

export async function registerAccount(input: { email: string; password: string; fullName: string }) {
  const response = await apiClient.post<ApiEnvelope<{ message: string }>>('/auth/register', input)
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
