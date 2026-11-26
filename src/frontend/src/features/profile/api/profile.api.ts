import type { UserProfile } from '@/features/auth'
import { apiClient } from '@/shared/api/client'
import type { ApiResponse } from '@/shared/api/contracts'

export async function getProfile() {
  const response = await apiClient.get<ApiResponse<UserProfile>>('/profile')
  return response.data.data!
}

export async function updateProfile(input: {
  fullName: string
  bio: string
  removeAvatar: boolean
  avatarAssetId?: string | null
}) {
  const response = await apiClient.put<ApiResponse<UserProfile>>('/profile', {
    fullName: input.fullName,
    bio: input.bio,
    removeAvatar: input.removeAvatar,
    avatarAssetId: input.avatarAssetId ?? null,
  })
  return response.data.data!
}

export async function linkGoogle(input: { idToken: string; currentPassword: string }) {
  const response = await apiClient.post<ApiResponse<UserProfile>>('/auth/link-google', input)
  return response.data.data!
}
