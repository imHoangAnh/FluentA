import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, LoaderCircle, X } from 'lucide-react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import * as reviewApi from '../../api/review.api'
import { reviewKeys } from '../../api/review.queries'
import { APP_TIME_ZONE } from '@/shared/lib/timezone'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/shared/components/ui/dialog'
import './review-setup.css'

type ReviewSetupProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReviewSetup({ open, onOpenChange }: ReviewSetupProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const dashboardQuery = useQuery({
    queryKey: reviewKeys.dashboardForTimeZone(APP_TIME_ZONE),
    queryFn: () => reviewApi.getReviewDashboard(APP_TIME_ZONE),
    enabled: open,
  })
  const startMutation = useMutation({
    mutationFn: () => reviewApi.createReviewSession({ timeZoneId: APP_TIME_ZONE }),
    onSuccess: (session) => {
      queryClient.setQueryData(reviewKeys.session(session.sessionId), session)
      void queryClient.invalidateQueries({ queryKey: reviewKeys.dashboard })
      const returnParams = new URLSearchParams(searchParams)
      returnParams.delete('review')
      const returnQuery = returnParams.toString()
      const returnTo = location.pathname + (returnQuery ? `?${returnQuery}` : '') + location.hash
      navigate(`/review/sessions/${session.sessionId}`, { replace: true, state: { returnTo } })
    },
  })

  const dueCount = dashboardQuery.data?.dueCount ?? 0
  const startDisabled = dashboardQuery.isLoading
    || dashboardQuery.isError
    || dueCount === 0
    || startMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="review-setup-dialog" aria-describedby="review-setup-description">
        <header className="review-setup__header" data-node-id="92:11">
          <span className="review-setup__eyebrow">DAILY REVIEW</span>
          <DialogClose asChild>
            <button className="review-setup__close" type="button" aria-label="Close review dialog" disabled={startMutation.isPending}>
              <X size={18} strokeWidth={1.35} color="#527168" aria-hidden="true" />
            </button>
          </DialogClose>
        </header>

        <div className="review-setup__welcome" data-node-id="92:16">
          <DialogTitle className="review-setup__title">Keep your words fresh.</DialogTitle>
          <DialogDescription className="review-setup__description" id="review-setup-description">
            A little review today. A stronger memory tomorrow.
          </DialogDescription>
        </div>

        <section className="review-setup__queue" aria-label="Today's review queue" data-node-id="92:19">
          <div className="review-setup__queue-copy">
            {dashboardQuery.isLoading ? (
              <LoaderCircle className="review-setup__loading" aria-label="Loading due words" />
            ) : dashboardQuery.isError ? (
              <p className="review-setup__load-error" role="alert">Unable to load your due words.</p>
            ) : (
              <>
                <strong data-testid="review-due-count">{dueCount}</strong>
                <span>{dueCount === 1 ? 'word ready to review' : 'words ready to review'}</span>
              </>
            )}
          </div>
          <img className="review-setup__illustration" src="/figma/learning/4e2e7.svg" alt="" width="72" height="72" />
        </section>

        {startMutation.isError ? (
          <p className="review-setup__start-error" role="alert">Unable to start review. Please try again.</p>
        ) : null}

        <Button
          className="review-setup__start"
          type="button"
          onClick={() => startMutation.mutate()}
          disabled={startDisabled}
        >
          <span>{startMutation.isPending ? 'Starting review…' : 'Start review'}</span>
          {startMutation.isPending ? (
            <LoaderCircle className="review-setup__start-loading" aria-hidden="true" />
          ) : (
            <ArrowRight size={18} strokeWidth={1.35} aria-hidden="true" />
          )}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
