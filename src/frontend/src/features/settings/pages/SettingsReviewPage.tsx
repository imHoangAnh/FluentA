import { Save } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { SettingsErrorPanel, SettingsLoadingPanel, SettingsPanel } from '../components/SettingsPanel'
import { SettingsSaveStatus, type SettingsSaveState } from '../components/SettingsSaveStatus'
import * as reviewApi from '@/features/review'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'

export function SettingsReviewPage() {
  const queryClient = useQueryClient()
  const [reviewDraft, setReviewDraft] = useState<reviewApi.ReviewSettings | null>(null)
  const [reviewLimitInput, setReviewLimitInput] = useState<string | null>(null)
  const [reviewState, setReviewState] = useState<SettingsSaveState>('idle')
  const [reviewError, setReviewError] = useState<string | null>(null)

  const reviewSettingsQuery = useQuery({ queryKey: ['review', 'settings'], queryFn: reviewApi.getReviewSettings })
  const updateReviewSettings = useMutation({
    mutationFn: reviewApi.updateReviewSettings,
    onMutate: () => {
      setReviewError(null)
      setReviewState('saving')
    },
    onSuccess: (settings) => {
      queryClient.setQueryData(['review', 'settings'], settings)
      queryClient.setQueryData(['settings'], (current: { reviewSettings?: reviewApi.ReviewSettings } | undefined) =>
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
  const hasUnsavedChanges = reviewDraft !== null && savedReview !== null && (
    reviewDraft.dailyLimit !== savedReview.dailyLimit
    || reviewDraft.recapAfterAnswer !== savedReview.recapAfterAnswer
  )

  function updateReviewDraft(next: reviewApi.ReviewSettings, inputValue = String(next.dailyLimit)) {
    setReviewDraft(next)
    setReviewLimitInput(inputValue)
    setReviewError(null)
    setReviewState('idle')
  }

  if (reviewSettingsQuery.isLoading && !review) return <SettingsLoadingPanel label="Loading review settings" />
  if (reviewSettingsQuery.isError || !review) return <SettingsErrorPanel message="Unable to load review settings." />

  const reviewInput = reviewLimitInput ?? String(review.dailyLimit)

  return (
    <SettingsPanel
      eyebrow="Learning"
      title="Review"
      description="Set the default daily workload and answer recap behavior."
      status={(
        <SettingsSaveStatus
          errorLabel={reviewError ?? 'Unable to save review settings. Your draft is still here.'}
          hasUnsavedChanges={hasUnsavedChanges}
          state={reviewState}
          successLabel="Review settings saved."
        />
      )}
      footer={(
        <>
          <span className="text-xs text-muted-foreground">These defaults apply to new Review sessions.</span>
          <Button
            type="button"
            disabled={!hasUnsavedChanges || updateReviewSettings.isPending}
            onClick={() => updateReviewSettings.mutate(review)}
          >
            <Save aria-hidden="true" />
            {updateReviewSettings.isPending ? 'Saving review settings...' : 'Save review settings'}
          </Button>
        </>
      )}
    >
      <div className="divide-y divide-border border-y border-border">
        <div className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_140px] sm:items-center">
          <div>
            <label className="text-sm font-semibold text-foreground" htmlFor="review-daily-limit">Daily review limit</label>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Maximum number of due words added to a Review session.</p>
          </div>
          <Input
            id="review-daily-limit"
            min="1"
            max="1000"
            type="number"
            value={reviewInput}
            onChange={(event) => {
              const raw = event.target.value
              updateReviewDraft({ ...review, dailyLimit: raw === '' ? 0 : Number(raw) }, raw)
            }}
          />
        </div>

        <label className="flex cursor-pointer flex-wrap items-center justify-between gap-4 py-4" htmlFor="review-recap-after-answer">
          <span>
            <strong className="block text-sm font-semibold text-foreground">Recap after each correct answer</strong>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">Show the word summary before moving to the next card.</span>
          </span>
          <span className="flex items-center gap-2 text-sm font-medium text-foreground">
            <input
              id="review-recap-after-answer"
              className="size-4 accent-primary"
              checked={review.recapAfterAnswer}
              type="checkbox"
              onChange={(event) => updateReviewDraft({ ...review, recapAfterAnswer: event.target.checked })}
            />
            {review.recapAfterAnswer ? 'On' : 'Off'}
          </span>
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
