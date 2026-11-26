import { ImageMinus, Save, Upload } from 'lucide-react'
import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { uploadAsset } from '@/features/assets'
import * as profileApi from '../api/profile.api'
import { profileKeys } from '../api/profile.queries'
import { ProfileErrorPanel, ProfileLoadingPanel } from '../components/ProfilePanel'
import { ProfileSaveStatus } from '../components/ProfileSaveStatus'
import { getAuthApiError, GoogleSignInButton, useAuthStore } from '@/features/auth'
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

export function ProfilePage() {
  const setUser = useAuthStore((state) => state.setUser)
  const authUser = useAuthStore((state) => state.user)
  const queryClient = useQueryClient()
  const [profileDraft, setProfileDraft] = useState<ProfileDraft | null>(null)
  const [profileMessage, setProfileMessage] = useState<string | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [googleLinkPassword, setGoogleLinkPassword] = useState('')
  const [googleLinkError, setGoogleLinkError] = useState<string | null>(null)
  const [googleLinkMessage, setGoogleLinkMessage] = useState<string | null>(null)

  const profileQuery = useQuery({ queryKey: profileKeys.all, queryFn: profileApi.getProfile })
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

      return profileApi.updateProfile({
        fullName: profile.fullName,
        bio: profile.bio,
        removeAvatar: profile.removeAvatar,
        avatarAssetId,
      })
    },
    onSuccess: (profile) => {
      setUser({ id: profile.id, fullName: profile.fullName, avatarUrl: profile.avatarDownloadUrl ?? null })
      queryClient.setQueryData(profileKeys.all, profile)
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
  const linkGoogle = useMutation({
    mutationFn: profileApi.linkGoogle,
    onSuccess: (linkedProfile) => {
      queryClient.setQueryData(profileKeys.all, linkedProfile)
      setGoogleLinkPassword('')
      setGoogleLinkError(null)
      setGoogleLinkMessage('Google account linked.')
    },
    onError: (error: unknown) => {
      setGoogleLinkMessage(null)
      setGoogleLinkError(getAuthApiError(error, 'Unable to link Google.').message)
    },
  })

  const savedProfile = useMemo<ProfileDraft | null>(() => profileQuery.data ? {
    fullName: profileQuery.data.fullName,
    email: profileQuery.data.email,
    bio: profileQuery.data.bio ?? '',
    avatarImageUrl: profileQuery.data.avatarDownloadUrl ?? null,
    avatarFile: null,
    avatarAssetId: null,
    removeAvatar: false,
  } : null, [profileQuery.data])
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

  if (profileQuery.isLoading && !profile) return <ProfileLoadingPanel label="Loading profile" />
  if (profileQuery.isError || !profileQuery.data || !profile || !savedProfile) {
    return <ProfileErrorPanel message="Unable to load your profile." />
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
    <ProfileSaveStatus
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

  async function acceptGoogleLinkCredential(idToken: string) {
    setGoogleLinkError(null)
    setGoogleLinkMessage(null)
    await linkGoogle.mutateAsync({ idToken, currentPassword: googleLinkPassword })
  }

  return (
    <form className="mx-auto max-w-3xl space-y-10 rounded-2xl border border-border bg-card px-6 py-7 shadow-[var(--ds-shadow-xs)] sm:px-8" onSubmit={submitProfile}>
      <div className="border-b border-border pb-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl/8 font-bold tracking-[-0.025em] text-foreground">Profile</h1>
            <p className="mt-1 text-sm/6 text-muted-foreground">This information will be displayed publicly so be careful what you share.</p>
          </div>
          <div className="pt-1">{status}</div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-7 sm:grid-cols-6">
          <div className="col-span-full sm:col-span-4">
            <span className="block text-sm font-semibold text-foreground">Photo</span>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <img
                className="size-16 shrink-0 rounded-full border border-border bg-muted object-cover"
                src={profileAvatarPreview}
                alt={`${profile.fullName} avatar preview`}
              />
              <label htmlFor="profile-avatar-file" className="inline-flex cursor-pointer items-center rounded-lg border border-input bg-card px-3.5 py-2 text-sm font-semibold text-foreground shadow-[var(--ds-shadow-xs)] transition-colors hover:border-primary/40 hover:bg-secondary/50 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary">
                <Upload aria-hidden="true" className="mr-2 size-4 text-primary" />
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
                className="h-auto px-2.5 py-2 text-sm font-medium text-muted-foreground hover:text-destructive"
                onClick={() => updateDraft({ avatarFile: null, avatarAssetId: null, removeAvatar: true })}
              >
                <ImageMinus aria-hidden="true" className="size-4" />
                Remove
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">JPG, PNG, or WebP. Maximum 2 MB.</p>
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="profile-full-name" className="block text-sm/6 font-semibold text-foreground">Full name</label>
            <div className="mt-2">
              <Input
                id="profile-full-name"
                className="h-10 rounded-lg border-input bg-card text-sm text-foreground focus-visible:border-primary focus-visible:ring-ring/20"
                value={profile.fullName}
                onChange={(event) => updateDraft({ fullName: event.target.value })}
              />
            </div>
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="profile-email" className="block text-sm/6 font-semibold text-foreground">Email</label>
            <div className="mt-2">
              <Input
                id="profile-email"
                className="h-10 rounded-lg border-border bg-muted/50 text-sm text-muted-foreground shadow-none"
                value={profile.email}
                readOnly
              />
            </div>
          </div>

          <div className="col-span-full">
            <label htmlFor="profile-bio" className="block text-sm/6 font-semibold text-foreground">About</label>
            <div className="mt-2">
              <textarea
                id="profile-bio"
                className="block min-h-28 w-full resize-y rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground shadow-[var(--ds-shadow-xs)] transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
                maxLength={500}
                placeholder="Write a few sentences about yourself."
                rows={4}
                value={profile.bio}
                onChange={(event) => updateDraft({ bio: event.target.value })}
              />
            </div>
            <p className="mt-2 text-right text-xs text-muted-foreground">{profile.bio.length}/500</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-4">
        <span className="text-sm text-muted-foreground">Changes stay local until you save.</span>
        <Button
          type="submit"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--ds-shadow-xs)] hover:bg-[#0d5e58] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          disabled={!hasUnsavedChanges || updateProfile.isPending}
        >
          <Save aria-hidden="true" />
          {updateProfile.isPending ? 'Saving profile...' : 'Save profile'}
        </Button>
      </div>
      <section className="border-t border-border pt-8" aria-label="Google account linking">
        <h2 className="text-lg font-semibold text-foreground">Google account</h2>
        {profileQuery.data.isGoogleLinked ? (
          <p className="mt-2 text-sm text-muted-foreground">Your Google account is linked.</p>
        ) : (
          <div className="mt-4 max-w-md space-y-3">
            <p className="text-sm text-muted-foreground">Enter your current password, then choose the Google account to link.</p>
            <label htmlFor="google-link-password" className="block text-sm font-semibold text-foreground">Current password</label>
            <Input
              id="google-link-password"
              type="password"
              autoComplete="current-password"
              value={googleLinkPassword}
              onChange={(event) => setGoogleLinkPassword(event.target.value)}
            />
            <GoogleSignInButton
              label="Link Google account"
              disabled={!googleLinkPassword.trim() || linkGoogle.isPending}
              onCredential={acceptGoogleLinkCredential}
            />
          </div>
        )}
        {googleLinkError ? <p role="alert" className="mt-3 text-sm text-destructive">{googleLinkError}</p> : null}
        {googleLinkMessage ? <p role="status" className="mt-3 text-sm text-primary">{googleLinkMessage}</p> : null}
      </section>
    </form>
  )
}

function readApiError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    return response?.data?.message ?? fallback
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
