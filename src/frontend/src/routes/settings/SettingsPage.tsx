import { ArrowLeft, Check, ImageMinus, LoaderCircle, LogOut, Save, Upload, XCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import * as flashcardApi from '../../lib/api/flashcard.api'
import * as settingsApi from '../../lib/api/settings.api'
import { getUserAvatarUrl } from '../../lib/avatar'
import { useAuthStore } from '../../stores/authStore'

const practiceModes: flashcardApi.PracticeMode[] = ['dictation', 'meaningToWord', 'pronunciation']

type ProfileDraft = {
  fullName: string
  email: string
  bio: string
  avatarUrl: string | null
  avatarFile: File | null
  removeAvatar: boolean
}

function sameSequence(left: flashcardApi.PracticeSettings, right: flashcardApi.PracticeSettings) {
  return left.modeSequence.join('|') === right.modeSequence.join('|')
}

export function SettingsPage() {
  const logout = useAuthStore((state) => state.logout)
  const setUser = useAuthStore((state) => state.setUser)
  const authUser = useAuthStore((state) => state.user)
  const queryClient = useQueryClient()
  const [profileDraft, setProfileDraft] = useState<ProfileDraft | null>(null)
  const [profileMessage, setProfileMessage] = useState<string | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [practiceDraft, setPracticeDraft] = useState<flashcardApi.PracticeSettings | null>(null)
  const [practiceState, setPracticeState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [reviewDraft, setReviewDraft] = useState<flashcardApi.ReviewSettings | null>(null)
  const [reviewLimitInput, setReviewLimitInput] = useState<string | null>(null)
  const [reviewState, setReviewState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.getSettings,
  })

  const updateProfile = useMutation({
    mutationFn: settingsApi.updateProfile,
    onSuccess: (profile) => {
      setUser(profile)
      queryClient.setQueryData(['settings'], (current: settingsApi.SettingsPayload | undefined) => current ? { ...current, profile } : current)
      setProfileDraft((current) => current ? {
        ...current,
        fullName: profile.fullName,
        bio: profile.bio ?? '',
        avatarUrl: profile.avatarUrl ?? null,
        avatarFile: null,
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

  const updatePracticeSettings = useMutation({
    mutationFn: flashcardApi.updatePracticeSettings,
    onMutate: () => {
      setPracticeState('saving')
    },
    onSuccess: (settings) => {
      queryClient.setQueryData(['flashcard', 'practice-settings'], settings)
      queryClient.setQueryData(['settings'], (current: settingsApi.SettingsPayload | undefined) => current ? { ...current, practiceSettings: settings } : current)
      setPracticeState('saved')
    },
    onError: () => {
      setPracticeState('error')
    },
  })

  const updateReviewSettings = useMutation({
    mutationFn: flashcardApi.updateReviewSettings,
    onMutate: () => {
      setReviewState('saving')
    },
    onSuccess: (settings) => {
      queryClient.setQueryData(['flashcard', 'settings'], settings)
      queryClient.setQueryData(['settings'], (current: settingsApi.SettingsPayload | undefined) => current ? { ...current, reviewSettings: settings } : current)
      setReviewState('saved')
    },
    onError: () => {
      setReviewState('error')
    },
  })

  const resolvedProfile = useMemo(
    () => profileDraft ?? (settingsQuery.data ? {
      fullName: settingsQuery.data.profile.fullName,
      email: settingsQuery.data.profile.email,
      bio: settingsQuery.data.profile.bio ?? '',
      avatarUrl: settingsQuery.data.profile.avatarUrl ?? null,
      avatarFile: null,
      removeAvatar: false,
    } : null),
    [profileDraft, settingsQuery.data],
  )
  const resolvedPractice = practiceDraft ?? settingsQuery.data?.practiceSettings ?? null
  const resolvedReview = reviewDraft ?? settingsQuery.data?.reviewSettings ?? null
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
      <main className="workspace settings-workspace settings-workspace--loading">
        <LoaderCircle className="settings-spinner" />
        <p>Loading settings...</p>
      </main>
    )
  }

  if (settingsQuery.isError || !settingsQuery.data || !resolvedProfile || !resolvedPractice || !resolvedReview) {
    return (
      <main className="workspace settings-workspace settings-workspace--loading">
        <p className="flashcard-status flashcard-status--error">Unable to load your settings.</p>
      </main>
    )
  }

  const profile = resolvedProfile
  const practice = resolvedPractice
  const review = resolvedReview
  const reviewInput = reviewLimitInput ?? String(review.dailyLimit)

  function moveMode(mode: flashcardApi.PracticeMode, direction: -1 | 1) {
    const index = practice.modeSequence.indexOf(mode)
    const target = index + direction
    if (index < 0 || target < 0 || target >= practice.modeSequence.length) return
    const next = [...practice.modeSequence]
    ;[next[index], next[target]] = [next[target], next[index]]
    const updated = { modeSequence: next }
    setPracticeDraft(updated)
    setPracticeState('idle')
    updatePracticeSettings.mutate(updated)
  }

  function toggleMode(mode: flashcardApi.PracticeMode) {
    const active = practice.modeSequence.includes(mode)
    if (active && practice.modeSequence.length === 1) {
      return
    }

    const updated = active
      ? { modeSequence: practice.modeSequence.filter((item) => item !== mode) }
      : { modeSequence: [...practice.modeSequence, mode] }

    if (sameSequence(updated, practice)) return
    setPracticeDraft(updated)
    setPracticeState('idle')
    updatePracticeSettings.mutate(updated)
  }

  function updateReview(next: flashcardApi.ReviewSettings, inputValue = String(next.dailyLimit)) {
    setReviewDraft(next)
    setReviewLimitInput(inputValue)
    setReviewState('idle')
    updateReviewSettings.mutate(next)
  }

  function saveProfile() {
    setProfileMessage(null)
    setProfileError(null)
    updateProfile.mutate({
      fullName: profile.fullName,
      bio: profile.bio,
      removeAvatar: profile.removeAvatar,
      avatarFile: profile.removeAvatar ? null : profile.avatarFile,
    })
  }

  return (
    <main className="workspace settings-workspace">
      <header className="workspace-header">
        <div className="brand-inline">
          <span className="brand-mark brand-mark--small">FA</span>
          <strong>FluentA</strong>
        </div>
        <nav className="workspace-nav" aria-label="Settings navigation">
          <Link className="ghost-button ghost-button--inline" to="/flashcards"><ArrowLeft size={17} /> Flashcards</Link>
          <button className="icon-button" type="button" onClick={() => void logout()} aria-label="Logout"><LogOut size={18} /></button>
        </nav>
      </header>

      <section className="settings-panel">
        <span className="preview-label">Profile</span>
        <h1>Your settings</h1>
        <p>Update the profile FluentA shows across your workspace, then adjust the learning defaults that power Practice and Review.</p>

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
                    removeAvatar: true,
                  })
                setProfileMessage(null)
                setProfileError(null)
              }}
            >
              <ImageMinus size={16} /> Remove avatar
            </button>
            <small>JPG, PNG, or WebP. Max 2MB. Upload happens only when you save the profile.</small>
          </div>
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

      <section className="settings-panel">
        <div className="settings-section-header">
          <div>
            <span className="preview-label">Practice settings</span>
            <h2>Practice mode sequence</h2>
          </div>
          <SettingsStatus state={practiceState} successLabel="Saved automatically." errorLabel="Unable to save practice settings. Your draft is still here." />
        </div>
        <p>Choose the global order Practice uses before each word reaches its recap step.</p>
        <div className="review-mode-options" role="group" aria-label="Practice mode sequence">
          {practiceModes.map((mode) => {
            const active = practice.modeSequence.includes(mode)
            return (
              <button key={mode} className={active ? 'review-mode review-mode--active' : 'review-mode'} type="button" onClick={() => toggleMode(mode)}>
                {mode === 'meaningToWord' ? 'Meaning -> Word' : capitalize(mode)}
                <small>{active ? 'Included in the sequence.' : 'Click to include this mode.'}</small>
              </button>
            )
          })}
        </div>
        <div className="settings-sequence-list">
          {practice.modeSequence.map((mode, index) => (
            <div key={mode} className="settings-sequence-item">
              <strong>{index + 1}. {mode === 'meaningToWord' ? 'Meaning -> Word' : capitalize(mode)}</strong>
              <div className="deck-actions">
                <button className="secondary-button" type="button" onClick={() => moveMode(mode, -1)}>Up</button>
                <button className="secondary-button" type="button" onClick={() => moveMode(mode, 1)}>Down</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="settings-panel">
        <div className="settings-section-header">
          <div>
            <span className="preview-label">Review settings</span>
            <h2>Board review defaults</h2>
          </div>
          <SettingsStatus state={reviewState} successLabel="Saved automatically." errorLabel="Unable to save review settings. Your draft is still here." />
        </div>
        <p>Control the global daily review limit and whether each correct answer shows a recap.</p>
        <div className="settings-form">
          <label>
            Daily limit
            <input
              min="1"
              max="1000"
              type="number"
              value={reviewInput}
              onChange={(event) => {
                const raw = event.target.value
                updateReview({ ...review, dailyLimit: raw === '' ? 0 : Number(raw) }, raw)
              }}
            />
          </label>
          <label className="settings-checkbox">
            <input
              checked={review.recapAfterAnswer}
              type="checkbox"
              onChange={(event) => updateReview({ ...review, recapAfterAnswer: event.target.checked })}
            />
            <span>Recap after each correct answer</span>
          </label>
        </div>
      </section>
    </main>
  )
}

function SettingsStatus({
  state,
  successLabel,
  errorLabel,
}: {
  state: 'idle' | 'saving' | 'saved' | 'error'
  successLabel: string
  errorLabel: string
}) {
  if (state === 'saving') {
    return <p className="settings-muted"><LoaderCircle size={14} className="settings-spin-inline" /> Saving...</p>
  }

  if (state === 'saved') {
    return <p className="settings-success"><Check size={14} /> {successLabel}</p>
  }

  if (state === 'error') {
    return <p className="flashcard-status flashcard-status--error"><XCircle size={14} /> {errorLabel}</p>
  }

  return null
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function readApiError(error: unknown, fallback: string) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { error?: { message?: string } } } }).response
    return response?.data?.error?.message ?? fallback
  }

  return fallback
}
