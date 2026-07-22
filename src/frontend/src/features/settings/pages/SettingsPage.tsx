import { ImageMinus, Save, Upload } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as assetsApi from '../api/avatar-assets.api'
import * as settingsApi from '../api/settings.api'
import { SettingsErrorPanel, SettingsLoadingPanel, SettingsPanel } from '../components/SettingsPanel'
import { SettingsSaveStatus } from '../components/SettingsSaveStatus'
import { useAuthStore } from '@/features/auth'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { getUserAvatarImageUrl } from '@/shared/lib/avatar-image'

type ProfileDraft = {
  fullName: string
  email: string
  bio: string
  avatarImageUrl: string | null
  avatarFile: File | null
  avatarAssetId: string | null
  removeAvatar: boolean
}

export function SettingsPage() {
  const setUser = useAuthStore((state) => state.setUser)
  const authUser = useAuthStore((state) => state.user)
  const queryClient = useQueryClient()
  const [profileDraft, setProfileDraft] = useState<ProfileDraft | null>(null)
  const [profileMessage, setProfileMessage] = useState<string | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)

  const settingsQuery = useQuery({ queryKey: ['settings'], queryFn: settingsApi.getSettings })
  const updateProfile = useMutation({
    mutationFn: async (profile: ProfileDraft) => {
      const validationError = validateProfileDraft(profile)
      if (validationError) throw new Error(validationError)

      let avatarAssetId = profile.removeAvatar ? null : profile.avatarAssetId
      if (!profile.removeAvatar && profile.avatarFile && !avatarAssetId) {
        const finalizedAsset = await assetsApi.uploadAvatarAsset(profile.avatarFile)
        avatarAssetId = finalizedAsset.id
        setProfileDraft((current) => current?.avatarFile === profile.avatarFile
          ? { ...current, avatarAssetId: finalizedAsset.id }
          : current)
      }

      return settingsApi.updateProfile({
        fullName: profile.fullName,
        bio: profile.bio,
        removeAvatar: profile.removeAvatar,
        avatarAssetId,
      })
    },
    onSuccess: (profile) => {
      setUser(profile)
      queryClient.setQueryData(['settings'], (current: settingsApi.SettingsPayload | undefined) => current
        ? { ...current, profile }
        : current)
      setProfileDraft({
        fullName: profile.fullName,
        email: profile.email,
        bio: profile.bio ?? '',
        avatarImageUrl: profile.avatarDownloadUrl ?? null,
        avatarFile: null,
        avatarAssetId: null,
        removeAvatar: false,
      })
      setProfileMessage('Profile saved.')
      setProfileError(null)
    },
    onError: (error: unknown) => {
      setProfileMessage(null)
      setProfileError(readApiError(error, 'Unable to save profile.'))
    },
  })

  const savedProfile = useMemo<ProfileDraft | null>(() => settingsQuery.data ? {
    fullName: settingsQuery.data.profile.fullName,
    email: settingsQuery.data.profile.email,
    bio: settingsQuery.data.profile.bio ?? '',
    avatarImageUrl: settingsQuery.data.profile.avatarDownloadUrl ?? null,
    avatarFile: null,
    avatarAssetId: null,
    removeAvatar: false,
  } : null, [settingsQuery.data])
  const profile = profileDraft ?? savedProfile
  const hasUnsavedChanges = profileDraft !== null && savedProfile !== null && (
    profileDraft.fullName !== savedProfile.fullName
    || profileDraft.bio !== savedProfile.bio
    || profileDraft.avatarFile !== null
    || profileDraft.avatarAssetId !== null
    || (profileDraft.removeAvatar && savedProfile.avatarImageUrl !== null)
  )

  const avatarFile = profile?.avatarFile ?? null
  const avatarPreviewUrl = useMemo(
    () => avatarFile ? URL.createObjectURL(avatarFile) : null,
    [avatarFile],
  )

  useEffect(() => {
    if (!avatarPreviewUrl) return
    return () => URL.revokeObjectURL(avatarPreviewUrl)
  }, [avatarPreviewUrl])

  const profileAvatarPreview = useMemo(() => {
    if (!profile) return getUserAvatarImageUrl(authUser, 'Learner')
    if (profile.removeAvatar) return getUserAvatarImageUrl(null, profile.fullName || 'Learner')
    return avatarPreviewUrl
      ?? profile.avatarImageUrl
      ?? getUserAvatarImageUrl(authUser, profile.fullName || 'Learner')
  }, [authUser, avatarPreviewUrl, profile])

  if (settingsQuery.isLoading && !profile) return <SettingsLoadingPanel label="Loading profile settings" />
  if (settingsQuery.isError || !settingsQuery.data || !profile || !savedProfile) {
    return <SettingsErrorPanel message="Unable to load your settings." />
  }

  const saveState = updateProfile.isPending
    ? 'saving'
    : profileError
      ? 'error'
      : profileMessage
        ? 'saved'
        : 'idle'

  function updateDraft(update: Partial<ProfileDraft>) {
    setProfileDraft({ ...profile!, ...update })
    setProfileMessage(null)
    setProfileError(null)
  }

  return (
    <SettingsPanel
      eyebrow="Account"
      title="Profile"
      description="Update the identity shown across your FluentA workspace."
      status={(
        <SettingsSaveStatus
          errorLabel={profileError ?? 'Unable to save profile.'}
          hasUnsavedChanges={hasUnsavedChanges}
          state={saveState}
          successLabel={profileMessage ?? 'Profile saved.'}
        />
      )}
      footer={(
        <>
          <span className="text-xs text-muted-foreground">Changes stay local until you save.</span>
          <Button
            type="button"
            disabled={!hasUnsavedChanges || updateProfile.isPending}
            onClick={() => updateProfile.mutate(profile)}
          >
            <Save aria-hidden="true" />
            {updateProfile.isPending ? 'Saving profile...' : 'Save profile'}
          </Button>
        </>
      )}
    >
      <div className="flex flex-wrap items-center gap-4">
        <img
          className="settings-avatar-preview size-20 shrink-0 rounded-full border border-border object-cover shadow-sm"
          src={profileAvatarPreview}
          alt={`${profile.fullName} avatar preview`}
        />
        <div className="grid min-w-0 gap-2">
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <label htmlFor="profile-avatar-file">
                <Upload aria-hidden="true" />
                Choose avatar
                <input
                  id="profile-avatar-file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  type="file"
                  onChange={(event) => updateDraft({
                    avatarFile: event.target.files?.[0] ?? null,
                    avatarAssetId: null,
                    removeAvatar: false,
                  })}
                />
              </label>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => updateDraft({ avatarFile: null, avatarAssetId: null, removeAvatar: true })}
            >
              <ImageMinus aria-hidden="true" />
              Remove
            </Button>
          </div>
          <p className="m-0 text-xs text-muted-foreground">JPG, PNG, or WebP. Maximum 2 MB.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-medium text-foreground" htmlFor="profile-full-name">
          Full name
          <Input
            id="profile-full-name"
            value={profile.fullName}
            onChange={(event) => updateDraft({ fullName: event.target.value })}
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-foreground" htmlFor="profile-email">
          Email
          <Input id="profile-email" value={profile.email} readOnly />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-foreground sm:col-span-2" htmlFor="profile-bio">
          Bio
          <textarea
            id="profile-bio"
            className="min-h-28 w-full resize-y rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
            maxLength={500}
            rows={4}
            value={profile.bio}
            onChange={(event) => updateDraft({ bio: event.target.value })}
          />
          <span className="text-right text-xs font-normal text-muted-foreground">{profile.bio.length}/500 characters</span>
        </label>
      </div>
    </SettingsPanel>
  )
}

function readApiError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { error?: { message?: string } } } }).response
    return response?.data?.error?.message ?? fallback
  }
  return fallback
}

function validateProfileDraft(profile: ProfileDraft) {
  const fullNameLength = profile.fullName.trim().length
  if (fullNameLength < 2 || fullNameLength > 100) return 'Full name must be between 2 and 100 characters.'
  if (profile.bio.trim().length > 500) return 'Bio must be 500 characters or fewer.'
  if (profile.removeAvatar || !profile.avatarFile) return null
  if (profile.avatarFile.size === 0) return 'Avatar file cannot be empty.'
  if (profile.avatarFile.size > 2 * 1024 * 1024) return 'Avatar file must be 2MB or smaller.'
  if (!allowedAvatarMimeTypes.has(profile.avatarFile.type)) return 'Avatar file must be JPG, PNG, or WebP.'
  return null
}

const allowedAvatarMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])
