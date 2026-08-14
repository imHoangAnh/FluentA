import { ImageMinus, Save, Upload } from 'lucide-react'
import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { uploadAsset } from '@/features/assets'
import * as settingsApi from '../api/settings.api'
import { settingsKeys } from '../api/settings.queries'
import { SettingsErrorPanel, SettingsLoadingPanel } from '../components/SettingsPanel'
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

  const settingsQuery = useQuery({ queryKey: settingsKeys.all, queryFn: settingsApi.getSettings })
  const updateProfile = useMutation({
    mutationFn: async (profile: ProfileDraft) => {
      const validationError = validateProfileDraft(profile)
      if (validationError) throw new Error(validationError)

      let avatarAssetId = profile.removeAvatar ? null : profile.avatarAssetId
      if (!profile.removeAvatar && profile.avatarFile && !avatarAssetId) {
        const finalizedAsset = await uploadAsset(profile.avatarFile, 'avatar')
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
      queryClient.setQueryData(settingsKeys.all, (current: settingsApi.SettingsPayload | undefined) => current
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

  const status = (
    <SettingsSaveStatus
      errorLabel={profileError ?? 'Unable to save profile.'}
      hasUnsavedChanges={hasUnsavedChanges}
      state={saveState}
      successLabel={profileMessage ?? 'Profile saved.'}
    />
  )

  function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (hasUnsavedChanges && profile && !updateProfile.isPending) updateProfile.mutate(profile)
  }

  return (
    <form className="mx-auto max-w-4xl space-y-12 rounded-lg bg-white px-4 py-6 sm:px-6 lg:px-8" onSubmit={submitProfile}>
      <div className="border-b border-gray-900/10 pb-12">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl/8 font-semibold text-gray-900">Profile</h1>
            <p className="mt-1 text-sm/6 text-gray-600">This information will be displayed publicly so be careful what you share.</p>
          </div>
          <div className="pt-1">{status}</div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
          <div className="col-span-full sm:col-span-4">
            <span className="block text-base/7 font-semibold text-gray-900">Photo</span>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <img
                className="size-16 shrink-0 rounded-full border border-gray-200 bg-gray-50 object-cover"
                src={profileAvatarPreview}
                alt={`${profile.fullName} avatar preview`}
              />
              <label htmlFor="profile-avatar-file" className="inline-flex cursor-pointer items-center rounded-md bg-white px-4 py-2.5 text-base font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-indigo-600">
                <Upload aria-hidden="true" className="mr-2 size-5" />
                Change
                <input
                  id="profile-avatar-file"
                  aria-label="Choose avatar"
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
              <Button
                variant="ghost"
                type="button"
                className="h-auto px-2 py-2 text-base font-medium text-gray-600 hover:text-gray-900"
                onClick={() => updateDraft({ avatarFile: null, avatarAssetId: null, removeAvatar: true })}
              >
                <ImageMinus aria-hidden="true" className="size-5" />
                Remove
              </Button>
            </div>
            <p className="mt-4 text-base/7 text-gray-600">JPG, PNG, or WebP. Maximum 2 MB.</p>
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="profile-full-name" className="block text-sm/6 font-medium text-gray-900">Full name</label>
            <div className="mt-2">
              <Input
                id="profile-full-name"
                className="block h-10 rounded-md border-gray-300 bg-white py-1.5 text-base text-gray-900 shadow-none outline-1 -outline-offset-1 outline-gray-300 focus-visible:border-indigo-600 focus-visible:outline-2 focus-visible:outline-indigo-600 focus-visible:ring-0 sm:text-sm/6"
                value={profile.fullName}
                onChange={(event) => updateDraft({ fullName: event.target.value })}
              />
            </div>
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="profile-email" className="block text-sm/6 font-medium text-gray-900">Email</label>
            <div className="mt-2">
              <Input
                id="profile-email"
                className="block h-10 rounded-md border-gray-300 bg-gray-50 py-1.5 text-base text-gray-500 shadow-none outline-1 -outline-offset-1 outline-gray-300 sm:text-sm/6"
                value={profile.email}
                readOnly
              />
            </div>
          </div>

          <div className="col-span-full">
            <label htmlFor="profile-bio" className="block text-sm/6 font-medium text-gray-900">About</label>
            <div className="mt-2">
              <textarea
                id="profile-bio"
                className="block min-h-28 w-full resize-y rounded-md border-0 bg-white px-3 py-1.5 text-base text-gray-900 shadow-none outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                maxLength={500}
                placeholder="Write a few sentences about yourself."
                rows={4}
                value={profile.bio}
                onChange={(event) => updateDraft({ bio: event.target.value })}
              />
            </div>
            <p className="mt-3 text-right text-sm/6 text-gray-600">{profile.bio.length}/500</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-x-6">
        <span className="text-sm/6 text-gray-500">Changes stay local until you save.</span>
        <Button
          type="submit"
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 focus-visible:ring-0"
          disabled={!hasUnsavedChanges || updateProfile.isPending}
        >
          <Save aria-hidden="true" />
          {updateProfile.isPending ? 'Saving profile...' : 'Save profile'}
        </Button>
      </div>
    </form>
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
