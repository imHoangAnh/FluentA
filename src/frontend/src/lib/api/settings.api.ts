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
  avatarFile?: File | null
}) {
  const form = new FormData()
  form.set('fullName', input.fullName)
  form.set('bio', input.bio)
  form.set('removeAvatar', input.removeAvatar ? 'true' : 'false')
  if (input.avatarFile) {
    form.set('avatar', input.avatarFile)
  }

  const response = await apiClient.put<ApiEnvelope<UserProfile>>('/profile', form, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return response.data.data!
}
