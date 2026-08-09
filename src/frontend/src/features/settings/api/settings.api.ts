import type { PracticeSettings } from '@/features/practice'
import type { UserProfile } from '@/features/auth'
import { apiClient } from '@/shared/lib/http/client'
import type { ApiEnvelope } from '@/shared/types/api'

export type SettingsPayload = {
  profile: UserProfile
  practiceSettings: PracticeSettings
}

export async function getSettings() {
  const response = await apiClient.get<ApiEnvelope<SettingsPayload>>('/settings')
  return response.data.data!
}

export async function updateProfile(input: {
  fullName: string
  bio: string
  removeAvatar: boolean
  avatarAssetId?: string | null
}) {
  const response = await apiClient.put<ApiEnvelope<UserProfile>>('/profile', {
    fullName: input.fullName,
    bio: input.bio,
    removeAvatar: input.removeAvatar,
    avatarAssetId: input.avatarAssetId ?? null,
  })
  return response.data.data!
}
