import { Check, LoaderCircle, Save, XCircle } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import * as flashcardApi from '../../lib/api/flashcard.api'

export function SettingsReviewPage() {
  const queryClient = useQueryClient()
  const [reviewDraft, setReviewDraft] = useState<flashcardApi.ReviewSettings | null>(null)
  const [reviewLimitInput, setReviewLimitInput] = useState<string | null>(null)
  const [reviewState, setReviewState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [reviewError, setReviewError] = useState<string | null>(null)

  const reviewSettingsQuery = useQuery({
    queryKey: ['review', 'settings'],
    queryFn: flashcardApi.getReviewSettings,
  })

  const updateReviewSettings = useMutation({
    mutationFn: flashcardApi.updateReviewSettings,
    onMutate: () => {
      setReviewError(null)
      setReviewState('saving')
    },
    onSuccess: (settings) => {
      queryClient.setQueryData(['review', 'settings'], settings)
      queryClient.setQueryData(['settings'], (current: { reviewSettings?: flashcardApi.ReviewSettings } | undefined) =>
        current ? { ...current, reviewSettings: settings } : current)
      setReviewDraft(null)
      setReviewLimitInput(String(settings.dailyLimit))
      setReviewError(null)
      setReviewState('saved')
    },
    onError: (error: unknown) => {
      setReviewError(readApiError(error, 'Unable to save review settings. Your draft is still here.'))
      setReviewState('error')
    },
  })

  const savedReview = reviewSettingsQuery.data ?? null
  const review = reviewDraft ?? savedReview
  const hasUnsavedChanges = reviewDraft !== null
    && savedReview !== null
    && (reviewDraft.dailyLimit !== savedReview.dailyLimit || reviewDraft.recapAfterAnswer !== savedReview.recapAfterAnswer)

  function updateReviewDraft(next: flashcardApi.ReviewSettings, inputValue = String(next.dailyLimit)) {
    setReviewDraft(next)
    setReviewLimitInput(inputValue)
    setReviewError(null)
    setReviewState('idle')
  }

  function saveReviewSettings() {
    if (!review || !hasUnsavedChanges) return
    updateReviewSettings.mutate(review)
  }

  if (reviewSettingsQuery.isLoading && !review) {
    return (
      <section className="settings-panel settings-panel--loading">
        <LoaderCircle className="settings-spinner" />
        <p>Loading review settings...</p>
      </section>
    )
  }

  if (reviewSettingsQuery.isError || !review) {
    return (
      <section className="settings-panel settings-panel--loading">
        <p className="flashcard-status flashcard-status--error">Unable to load review settings.</p>
      </section>
    )
  }

  const reviewInput = reviewLimitInput ?? String(review.dailyLimit)

  return (
    <section className="settings-panel">
      <div className="settings-section-header">
        <div>
          <span className="preview-label">Review settings</span>
          <h2>Board review defaults</h2>
        </div>
        <SettingsStatus
          hasUnsavedChanges={hasUnsavedChanges}
          errorLabel={reviewError}
          state={reviewState}
          successLabel="Review settings saved."
        />
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
              updateReviewDraft({ ...review, dailyLimit: raw === '' ? 0 : Number(raw) }, raw)
            }}
          />
        </label>
        <label className="settings-checkbox">
          <input
            checked={review.recapAfterAnswer}
            type="checkbox"
            onChange={(event) => updateReviewDraft({ ...review, recapAfterAnswer: event.target.checked })}
          />
          <span>Recap after each correct answer</span>
        </label>
        <button
          className="primary-button settings-save-button"
          type="button"
          disabled={!hasUnsavedChanges || updateReviewSettings.isPending}
          onClick={saveReviewSettings}
        >
          <Save size={17} /> {updateReviewSettings.isPending ? 'Saving review settings...' : 'Save review settings'}
        </button>
      </div>
    </section>
  )
}

function SettingsStatus({
  hasUnsavedChanges,
  errorLabel,
  state,
  successLabel,
}: {
  hasUnsavedChanges: boolean
  errorLabel: string | null
  state: 'idle' | 'saving' | 'saved' | 'error'
  successLabel: string
}) {
  if (state === 'saving') {
    return <p className="settings-muted"><LoaderCircle size={14} className="settings-spin-inline" /> Saving...</p>
  }

  if (state === 'saved') {
    return <p className="settings-success"><Check size={14} /> {successLabel}</p>
  }

  if (state === 'error' && errorLabel) {
    return <p className="flashcard-status flashcard-status--error"><XCircle size={14} /> {errorLabel}</p>
  }

  if (hasUnsavedChanges) {
    return <p className="settings-muted">Unsaved changes.</p>
  }

  return null
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
