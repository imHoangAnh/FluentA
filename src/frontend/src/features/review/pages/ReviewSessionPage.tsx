import { ArrowLeft, LoaderCircle, RotateCcw } from 'lucide-react'
import axios from 'axios'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import * as reviewApi from '../api/review.api'
import { reviewKeys } from '../api/review.queries'
import { ReviewCompletion } from '../components/session/ReviewCompletion'
import { ReviewModeSurface, type ReviewFeedback } from '../components/session/ReviewModeSurface'
import { ReviewProgress } from '../components/session/ReviewProgress'
import '../components/session/review-session.css'

function isUnavailableReviewItemError(error: unknown) {
  if (!axios.isAxiosError(error)) return false
  const errors = (error.response?.data as { errors?: { code?: string }[] } | undefined)?.errors
  return errors?.some((item) => item.code === 'REVIEW_ITEM_NOT_FOUND') ?? false
}

function statusIsComplete(status: string) {
  return status.toLowerCase() === 'complete' || status.toLowerCase() === 'completed'
}

function itemWithAnswerResult(
  item: reviewApi.ReviewSessionItem,
  result: reviewApi.ReviewAnswerResult,
): reviewApi.ReviewSessionItem {
  return {
    ...item,
    isReviewed: result.isReviewed || item.isReviewed,
    result: result.isReviewed ? result.result : item.result,
    levelBefore: result.levelBefore ?? item.levelBefore,
    levelAfter: result.levelAfter ?? item.levelAfter,
    nextReviewDateBefore: result.nextReviewDateBefore ?? item.nextReviewDateBefore,
    nextReviewDateAfter: result.nextReviewDateAfter ?? item.nextReviewDateAfter,
  }
}

function withAnswerResult(
  session: reviewApi.ReviewSession,
  result: reviewApi.ReviewAnswerResult,
): reviewApi.ReviewSession {
  return {
    ...session,
    completedWords: result.completedWords,
    currentItemIndex: result.currentItemIndex,
    status: result.sessionStatus,
    items: session.items.map((item) =>
      item.itemId === result.itemId ? itemWithAnswerResult(item, result) : item,
    ),
  }
}

function ReviewStateCard({
  title,
  message,
  actionLabel,
  onAction,
  onBack,
  backLabel = 'Back to Dashboard',
}: {
  title: string
  message: string
  actionLabel: string
  onAction: () => void
  onBack?: () => void
  backLabel?: string
}) {
  return (
    <div className="review-figma-session" data-testid="review-page">
      {onBack ? (
        <div className="review-session-top">
          <button type="button" className="review-exit-link" onClick={onBack}>
            <ArrowLeft size={15} aria-hidden="true" />
            <span>{backLabel}</span>
          </button>
        </div>
      ) : null}
      <section className="review-figma-session__card review-state-card">
        <div className="review-state-content">
          <span className="review-done-icon-circle" aria-hidden="true">
            <RotateCcw size={24} />
          </span>
          <div className="review-state-copy">
            <h1>{title}</h1>
            <p>{message}</p>
          </div>
          <button className="review-btn-primary review-btn-done" type="button" onClick={onAction}>
            {actionLabel}
          </button>
        </div>
      </section>
    </div>
  )
}

export function ReviewSessionPage() {
  const { sessionId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [typedAnswer, setTypedAnswer] = useState('')
  const [outcomeFeedback, setOutcomeFeedback] = useState<ReviewFeedback | null>(null)
  const cardStartedAt = useRef(0)

  const sessionQuery = useQuery({
    queryKey: reviewKeys.session(sessionId ?? ''),
    queryFn: () => reviewApi.getReviewSession(sessionId!),
    enabled: Boolean(sessionId),
    staleTime: 15_000,
  })
  const session = sessionQuery.data

  const answerMutation = useMutation({
    mutationFn: reviewApi.submitReviewAnswer,
    onError: (error, variables) => {
      if (!isUnavailableReviewItemError(error)) return
      setTypedAnswer('')
      setOutcomeFeedback(null)
      void queryClient.invalidateQueries({ queryKey: reviewKeys.session(variables.sessionId) })
    },
    onSuccess: (result, variables) => {
      const queryKey = reviewKeys.session(variables.sessionId)
      const current = queryClient.getQueryData<reviewApi.ReviewSession>(queryKey)
      const answeredItem = current?.items.find((item) => item.itemId === result.itemId)
      queryClient.setQueryData<reviewApi.ReviewSession>(queryKey, (cached) =>
        cached ? withAnswerResult(cached, result) : cached,
      )
      if (answeredItem) {
        setOutcomeFeedback({
          kind: result.correct ? 'correct' : 'wrong',
          item: itemWithAnswerResult(answeredItem, result),
        })
      }
      void queryClient.invalidateQueries({ queryKey, exact: true })
      void queryClient.invalidateQueries({ queryKey: reviewKeys.dashboard })
    },
  })

  const currentItem = session?.currentItemIndex === null || session?.currentItemIndex === undefined
    ? null
    : session.items[session.currentItemIndex] ?? session.items.find((item) => !item.isReviewed) ?? null
  const sessionComplete = Boolean(session && (
    statusIsComplete(session.status)
    || session.currentItemIndex === null
    || session.currentItemIndex >= session.items.length
  ))
  const correctCount = useMemo(
    () => session?.items.filter((item) => item.result?.toLowerCase() === 'correct').length ?? 0,
    [session?.items],
  )
  const wrongCount = useMemo(
    () => session?.items.filter((item) => item.result?.toLowerCase() === 'wrong').length ?? 0,
    [session?.items],
  )

  const submitTypedAnswer = useCallback((answerText: string) => {
    if (!session || !currentItem || answerMutation.isPending || outcomeFeedback) return
    answerMutation.mutate({
      sessionId: session.sessionId,
      itemId: currentItem.itemId,
      answerText,
      timeSpentSeconds: Math.max(0, Math.round((Date.now() - cardStartedAt.current) / 1000)),
    })
  }, [answerMutation, currentItem, outcomeFeedback, session])

  const finishSession = useCallback(() => {
    const navigationState = location.state as { returnTo?: string } | null
    navigate(navigationState?.returnTo || '/', { replace: true })
  }, [location.state, navigate])

  const continueAfterFeedback = useCallback(() => {
    if (!outcomeFeedback) return
    setOutcomeFeedback(null)
    setTypedAnswer('')
    cardStartedAt.current = Date.now()
  }, [outcomeFeedback])

  useEffect(() => {
    if (!session) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return
      const target = event.target as HTMLElement | null
      const isInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable

      if (sessionComplete && !outcomeFeedback) {
        if (event.key === 'Enter' && !target?.closest('button')) {
          event.preventDefault()
          finishSession()
        }
        return
      }

      if (outcomeFeedback) {
        if (event.key === 'Enter' && !target?.closest('button')) {
          event.preventDefault()
          continueAfterFeedback()
        }
        return
      }

      if (!currentItem) return

      if (event.key === 'Enter' && !isInput && !target?.closest('button') && typedAnswer.trim().length > 0) {
        event.preventDefault()
        submitTypedAnswer(typedAnswer)
        return
      }

      if (event.key === 'Escape' && !answerMutation.isPending) {
        event.preventDefault()
        submitTypedAnswer('')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    answerMutation.isPending,
    continueAfterFeedback,
    currentItem,
    finishSession,
    outcomeFeedback,
    session,
    sessionComplete,
    submitTypedAnswer,
    typedAnswer,
  ])

  useEffect(() => {
    if (currentItem) cardStartedAt.current = Date.now()
  }, [currentItem])

  if (!sessionId) {
    return (
      <ReviewStateCard
        title="Review"
        message="Open the Review dialog from the Learning menu in the top bar to see today’s due words."
        actionLabel="Open Review"
        onAction={() => navigate('/?review=open')}
      />
    )
  }

  if (sessionQuery.isLoading) {
    return (
      <div className="review-figma-session" data-testid="review-page">
        <div className="review-session-top">
          <button type="button" className="review-exit-link" onClick={finishSession}>
            <ArrowLeft size={15} aria-hidden="true" />
            <span>End Review Session</span>
          </button>
        </div>
        <div className="review-figma-session__loading" role="status" aria-label="Loading review session">
          <LoaderCircle aria-hidden="true" />
          <span>Loading review session…</span>
        </div>
      </div>
    )
  }

  if (sessionQuery.isError || !session) {
    return (
      <ReviewStateCard
        title="Session unavailable"
        message="Unable to load this review session."
        actionLabel="Try again"
        onAction={() => void sessionQuery.refetch()}
        onBack={finishSession}
      />
    )
  }

  if (session.totalWords === 0) {
    return (
      <ReviewStateCard
        title="All clear"
        message="No words are due right now."
        actionLabel="Done"
        onAction={finishSession}
        onBack={finishSession}
      />
    )
  }

  if (session.status.toLowerCase() === 'abandoned') {
    return (
      <ReviewStateCard
        title="Session unavailable"
        message="This session is no longer active."
        actionLabel="Done"
        onAction={finishSession}
        onBack={finishSession}
      />
    )
  }

  if (sessionComplete && !outcomeFeedback) {
    return (
      <div className="review-figma-session" data-testid="review-page">
        <ReviewCompletion
          totalWords={session.totalWords}
          correctCount={correctCount}
          wrongCount={wrongCount}
          onDone={finishSession}
        />
      </div>
    )
  }

  const itemForExercise = outcomeFeedback?.item ?? currentItem
  if (!itemForExercise) {
    return (
      <ReviewStateCard
        title="Session unavailable"
        message="This review session has no active word."
        actionLabel="Done"
        onAction={finishSession}
        onBack={finishSession}
      />
    )
  }

  const progressItemIndex = session.items.findIndex((item) => item.itemId === itemForExercise.itemId)
  const progressCurrentWord = progressItemIndex >= 0
    ? progressItemIndex + 1
    : Math.min(session.completedWords + 1, session.totalWords)

  return (
    <div className="review-figma-session" data-testid="review-page">
      <ReviewProgress
        currentWord={progressCurrentWord}
        totalWords={session.totalWords}
        onExit={finishSession}
      />

      <article className="review-figma-session__card" data-testid="active-review-card">
        <ReviewModeSurface
          item={itemForExercise}
          typedAnswer={typedAnswer}
          feedback={outcomeFeedback}
          isBusy={answerMutation.isPending}
          onAnswerChange={setTypedAnswer}
          onCheckAnswer={() => submitTypedAnswer(typedAnswer)}
          onSkip={() => submitTypedAnswer('')}
          onContinue={continueAfterFeedback}
        />
      </article>

      <p className="review-figma-session__shortcuts" aria-label="Keyboard shortcuts">
        {outcomeFeedback ? (
          <>
            Shortcuts: <kbd>[Enter]</kbd> Continue
          </>
        ) : (
          <>
            Shortcuts: <kbd>[Enter]</kbd> Check Answer <span aria-hidden="true">•</span> <kbd>[Esc]</kbd> Skip
          </>
        )}
      </p>

      {answerMutation.isError && answerMutation.variables?.itemId === currentItem?.itemId ? (
        <p className="review-figma-session__error" role="alert">
          Unable to save this answer. Try again.
        </p>
      ) : null}
    </div>
  )
}
