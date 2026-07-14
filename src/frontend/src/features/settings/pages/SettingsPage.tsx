import { Check, ImageMinus, LoaderCircle, Save, Upload, XCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as assetsApi from '../api/avatar-assets.api'
import * as settingsApi from '../api/settings.api'
import { getUserAvatarUrl } from '@/shared/lib/avatar'
import { useAuthStore } from '@/features/auth'

type ProfileDraft = {
  fullName: string
  email: string
  bio: string
  avatarUrl: string | null
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

  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.getSettings,
  })
  const assetsQuery = useQuery({
    queryKey: ['assets', 'avatar'],
    queryFn: assetsApi.listAvatarAssets,
  })

  const updateProfile = useMutation({
    mutationFn: async (profile: ProfileDraft) => {
      const validationError = validateProfileDraft(profile)
      if (validationError) {
        throw new Error(validationError)
      }

      let avatarAssetId = profile.removeAvatar ? null : profile.avatarAssetId
      if (!profile.removeAvatar && profile.avatarFile && !avatarAssetId) {
        const finalizedAsset = await assetsApi.uploadAvatarAsset(profile.avatarFile)
        avatarAssetId = finalizedAsset.id
        setProfileDraft((current) => current && current.avatarFile === profile.avatarFile
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
      queryClient.setQueryData(['settings'], (current: settingsApi.SettingsPayload | undefined) => current ? { ...current, profile } : current)
      void queryClient.invalidateQueries({ queryKey: ['assets', 'avatar'] })
      setProfileDraft((current) => current ? {
        ...current,
        fullName: profile.fullName,
        bio: profile.bio ?? '',
        avatarUrl: profile.avatarUrl ?? null,
        avatarFile: null,
        avatarAssetId: null,
        removeAvatar: false,
      } : current)
      setProfileMessage('Profile saved.')
      setProfileError(null)
    },
    onError: (error: unknown) => {
      setProfileMessage(null)
      setProfileError(readApiError(error, 'Unable to save profile.'))
    },
  })
  const deleteAsset = useMutation({
    mutationFn: async (asset: assetsApi.OwnedAvatarAsset) => {
      await assetsApi.deleteAvatarAsset(asset.id)
      return asset
    },
    onSuccess: (asset) => {
      queryClient.setQueryData(['assets', 'avatar'], (current: assetsApi.OwnedAvatarAsset[] | undefined) =>
        current ? current.filter((item) => item.id !== asset.id) : current)
      if (asset.isCurrentAvatar && authUser) {
        const nextUser = { ...authUser, avatarUrl: null }
        setUser(nextUser)
        queryClient.setQueryData(['settings'], (current: settingsApi.SettingsPayload | undefined) => current ? {
          ...current,
          profile: {
            ...current.profile,
            avatarUrl: null,
          },
        } : current)
        setProfileDraft((current) => current ? {
          ...current,
          avatarUrl: null,
          avatarFile: null,
          avatarAssetId: null,
          removeAvatar: false,
        } : current)
      }

      setProfileMessage(asset.isCurrentAvatar ? 'Current avatar deleted.' : 'Saved avatar deleted.')
      setProfileError(null)
    },
    onError: (error: unknown) => {
      setProfileMessage(null)
      setProfileError(readApiError(error, 'Unable to delete avatar.'))
    },
  })

  const resolvedProfile = useMemo(
    () => profileDraft ?? (settingsQuery.data ? {
      fullName: settingsQuery.data.profile.fullName,
      email: settingsQuery.data.profile.email,
      bio: settingsQuery.data.profile.bio ?? '',
      avatarUrl: settingsQuery.data.profile.avatarUrl ?? null,
      avatarFile: null,
      avatarAssetId: null,
      removeAvatar: false,
    } : null),
    [profileDraft, settingsQuery.data],
  )

  const ownedAssets = assetsQuery.data ?? []
  const avatarPreviewUrl = useMemo(
    () => resolvedProfile?.avatarFile ? URL.createObjectURL(resolvedProfile.avatarFile) : null,
    [resolvedProfile],
  )

  useEffect(() => {
    if (!avatarPreviewUrl) return
    return () => URL.revokeObjectURL(avatarPreviewUrl)
  }, [avatarPreviewUrl])

  const profileAvatarPreview = useMemo(() => {
    if (!resolvedProfile) return getUserAvatarUrl(authUser, 'Learner')
    if (resolvedProfile.removeAvatar) {
      return getUserAvatarUrl({ avatarUrl: null }, resolvedProfile.fullName || 'Learner')
    }

    if (avatarPreviewUrl) {
      return avatarPreviewUrl
    }

    return resolvedProfile.avatarUrl ?? getUserAvatarUrl(authUser, resolvedProfile.fullName || 'Learner')
  }, [authUser, avatarPreviewUrl, resolvedProfile])

  if (settingsQuery.isLoading && !settingsQuery.data) {
    return (
      <section className="settings-panel settings-panel--loading">
        <LoaderCircle className="settings-spinner" />
        <p>Loading settings...</p>
      </section>
    )
  }

  if (settingsQuery.isError || !settingsQuery.data || !resolvedProfile) {
    return (
      <section className="settings-panel settings-panel--loading">
        <p className="flashcard-status flashcard-status--error">Unable to load your settings.</p>
      </section>
    )
  }

  const profile = resolvedProfile

  function saveProfile() {
    setProfileMessage(null)
    setProfileError(null)
    updateProfile.mutate(profile)
  }

  return (
    <section className="settings-panel">
      <span className="preview-label">Profile</span>
      <h2>Your settings</h2>
      <p>Update the profile FluentA shows across your workspace, including avatar preview, saved avatars, your full name, and bio.</p>

      <div className="settings-profile-card">
        <img className="settings-avatar-preview" src={profileAvatarPreview} alt={`${profile.fullName} avatar preview`} />
        <div className="settings-avatar-actions">
          <label className="secondary-button settings-upload-button">
            <Upload size={16} /> Choose avatar
            <input
              accept="image/jpeg,image/png,image/webp"
              className="settings-file-input"
              type="file"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null
                setProfileDraft({
                  ...profile,
                  avatarFile: file,
                  avatarAssetId: null,
                  removeAvatar: false,
                })
                setProfileMessage(null)
                setProfileError(null)
              }}
            />
          </label>
          <button
            className="ghost-button ghost-button--inline settings-remove-button"
            type="button"
            onClick={() => {
              setProfileDraft({
                ...profile,
                avatarFile: null,
                avatarAssetId: null,
                removeAvatar: true,
              })
              setProfileMessage(null)
              setProfileError(null)
            }}
          >
            <ImageMinus size={16} /> Remove avatar
          </button>
          <small>JPG, PNG, or WebP. Max 2MB. Upload starts only when you save the profile.</small>
        </div>
      </div>

      <div className="settings-saved-assets">
        <div className="settings-saved-assets-header">
          <strong>Saved avatars</strong>
          {assetsQuery.isLoading ? <span className="settings-muted">Loading...</span> : null}
        </div>
        {ownedAssets.length === 0 ? (
          <p className="settings-muted">No saved avatars yet.</p>
        ) : (
          <div className="settings-asset-grid">
            {ownedAssets.map((asset) => (
              <article key={asset.id} className="settings-asset-card">
                {asset.status === 'finalized' ? (
                  <img className="settings-asset-thumb" src={asset.publicUrl} alt="Saved avatar" />
                ) : (
                  <div className="settings-asset-thumb settings-asset-thumb--placeholder">{asset.status}</div>
                )}
                <div className="settings-asset-copy">
                  <strong>{asset.isCurrentAvatar ? 'Current avatar' : 'Saved avatar'}</strong>
                  <small>{asset.status} • {formatAssetSize(asset.sizeBytes)}</small>
                </div>
                <button
                  className="ghost-button ghost-button--inline settings-asset-delete"
                  type="button"
                  disabled={deleteAsset.isPending}
                  onClick={() => {
                    setProfileMessage(null)
                    setProfileError(null)
                    deleteAsset.mutate(asset)
                  }}
                >
                  <ImageMinus size={16} /> Delete
                </button>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="settings-form">
        <label>
          Full name
          <input value={profile.fullName} onChange={(event) => setProfileDraft({ ...profile, fullName: event.target.value })} />
        </label>
        <label>
          Email
          <input value={profile.email} readOnly />
        </label>
        <label>
          Bio
          <textarea maxLength={500} rows={5} value={profile.bio} onChange={(event) => setProfileDraft({ ...profile, bio: event.target.value })} />
          <small>{profile.bio.length}/500 characters</small>
        </label>
        <button className="primary-button settings-save-button" type="button" disabled={updateProfile.isPending} onClick={saveProfile}>
          <Save size={17} /> {updateProfile.isPending ? 'Saving profile...' : 'Save profile'}
        </button>
      </div>
      {profileMessage ? <p className="settings-success"><Check size={16} /> {profileMessage}</p> : null}
      {profileError ? <p className="flashcard-status flashcard-status--error"><XCircle size={16} /> {profileError}</p> : null}
    </section>
  )
}

function formatAssetSize(sizeBytes: number) {
  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (sizeBytes >= 1024) {
    return `${Math.round(sizeBytes / 1024)} KB`
  }

  return `${sizeBytes} B`
}

function readApiError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { error?: { message?: string } } } }).response
    return response?.data?.error?.message ?? fallback
  }

  return fallback
}

function validateProfileDraft(profile: ProfileDraft) {
  const fullNameLength = profile.fullName.trim().length
  if (fullNameLength < 2 || fullNameLength > 100) {
    return 'Full name must be between 2 and 100 characters.'
  }

  if (profile.bio.trim().length > 500) {
    return 'Bio must be 500 characters or fewer.'
  }

  if (profile.removeAvatar || !profile.avatarFile) {
    return null
  }

  if (profile.avatarFile.size === 0) {
    return 'Avatar file cannot be empty.'
  }

  if (profile.avatarFile.size > 2 * 1024 * 1024) {
    return 'Avatar file must be 2MB or smaller.'
  }

  if (!allowedAvatarMimeTypes.has(profile.avatarFile.type)) {
    return 'Avatar file must be JPG, PNG, or WebP.'
  }

  return null
}

const allowedAvatarMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
])
