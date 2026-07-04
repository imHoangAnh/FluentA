import type { PracticeSettings, ReviewSettings } from './flashcard.api'
import { apiClient } from './client'
import type { ApiEnvelope, UserProfile } from './auth.api'

export type SettingsPayload = {
  profile: UserProfile
  practiceSettings: PracticeSettings
  reviewSettings: ReviewSettings
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
