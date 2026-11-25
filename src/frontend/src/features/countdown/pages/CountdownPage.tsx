import { CalendarClock, ChevronDown, ImagePlus, Plus, Trash2, X } from 'lucide-react'
import { type FormEvent, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/shared/components/ui/context-menu'
import { AlertDialog, AlertDialogActionButton, AlertDialogCancelButton, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from '@/shared/components/ui/alert-dialog'
import { uploadAsset } from '@/features/assets'
import { toast } from '@/shared/lib/toast'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { cn } from '@/shared/lib/utils'
import { addCalendarDays, differenceInCalendarDays, formatDateOnly, todayUtc } from '@/shared/lib/date'
import * as countdownApi from '../api/countdown.api'
import { countdownKeys } from '../api/countdown.queries'

function defaultTargetDate(now = new Date()) {
  return addCalendarDays(todayUtc(now), 7)
}

function formatTargetDate(value: string) {
  return formatDateOnly(value, {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  })
}

function statusText(item: countdownApi.CountdownEvent, now = new Date()) {
  if (item.isCompleted) {
    return ''
  }

  const diff = differenceInCalendarDays(item.targetDate, todayUtc(now))
  if (!Number.isFinite(diff)) return 'Unknown'
  return diff <= 0 ? 'Today' : `${diff} day${diff === 1 ? '' : 's'} left`
}

export function CountdownPage() {
  const queryClient = useQueryClient()

  const [showFormModal, setShowFormModal] = useState(false)
  const [name, setName] = useState('')
  const [targetDate, setTargetDate] = useState(defaultTargetDate)
  const [deletingCountdown, setDeletingCountdown] = useState<countdownApi.CountdownEvent | null>(null)
  const [openBoard, setOpenBoard] = useState<'active' | 'complete'>('active')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [now, setNow] = useState(() => new Date())
  const appDateRef = useRef(todayUtc())
  const dialogTitleId = useId()
  const createTriggerRef = useRef<HTMLButtonElement | null>(null)

  const countdownsQuery = useQuery({
    queryKey: countdownKeys.events,
    queryFn: countdownApi.listCountdowns,
  })

  const countdowns = useMemo(() => countdownsQuery.data ?? [], [countdownsQuery.data])

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: countdownKeys.events })
  }

  const resetForm = useCallback(() => {
    setName('')
    setTargetDate(defaultTargetDate())
    setCoverFile(null)
    setFormError(null)
    setShowFormModal(false)
    window.requestAnimationFrame(() => createTriggerRef.current?.focus())
  }, [])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const nextNow = new Date()
      setNow(nextNow)

      const nextAppDate = todayUtc(nextNow)
      if (appDateRef.current === nextAppDate) return

      appDateRef.current = nextAppDate
      void queryClient.invalidateQueries({ queryKey: countdownKeys.events, refetchType: 'all' })
    }, 60_000)
    return () => window.clearInterval(intervalId)
  }, [queryClient])

  useEffect(() => {
    if (!showFormModal) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') resetForm()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [resetForm, showFormModal])

  const createCountdown = useMutation({
    mutationFn: async () => {
      let coverAssetId: string | null = null
      if (coverFile) {
        const asset = await uploadAsset(coverFile, 'countdown-cover')
        coverAssetId = asset.id
      }

      return countdownApi.createCountdown({
        name,
        targetDate,
        coverAssetId,
      })
    },
    onSuccess: async () => {
      resetForm()
      await refresh()
    },
    onError: () => setFormError('Countdown could not be created.'),
  })

  const deleteCountdown = useMutation({
    mutationFn: countdownApi.deleteCountdown,
    onSuccess: async () => {
      setDeletingCountdown(null)
      await refresh()
      toast.success('Countdown deleted.')
    },
    onError: () => toast.error('Could not delete the countdown. Please try again.'),
  })

  function submitCountdown(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) return
    createCountdown.mutate()
  }

  const activeCountdowns = useMemo(() => countdowns.filter((item) => !item.isCompleted), [countdowns])
  const completedCountdowns = useMemo(() => countdowns.filter((item) => item.isCompleted), [countdowns])

  function renderBoard(board: 'active' | 'complete', title: string, items: countdownApi.CountdownEvent[]) {
    const isOpen = openBoard === board
    return (
      <Card className={cn('countdown-board flex flex-col overflow-hidden', `countdown-board--${board}`)}>
        <button
          className="flex w-full items-center justify-between border-b border-border/60 bg-transparent px-4 py-3 text-left transition-colors hover:bg-secondary/40 sm:px-5 sm:py-3.5"
          type="button"
          aria-label={`${title} board, ${items.length} countdown${items.length === 1 ? '' : 's'}`}
          aria-expanded={isOpen}
          aria-controls={`countdown-board-${board}`}
          onClick={() => setOpenBoard(isOpen ? (board === 'active' ? 'complete' : 'active') : board)}
        >
          <span className="flex items-baseline gap-2">
            <h2 className="m-0 text-sm font-semibold text-foreground sm:text-base">{title}</h2>
            <small className="text-xs text-muted-foreground">{items.length} countdown{items.length === 1 ? '' : 's'}</small>
          </span>
          <ChevronDown className={cn('size-4 text-muted-foreground transition-transform duration-200', isOpen && 'rotate-180')} size={18} aria-hidden="true" />
        </button>
        {isOpen ? (
          <CardContent className="min-h-0 p-4 sm:p-5" id={`countdown-board-${board}`}>
            {items.length > 0 ? (
              <div className="countdown-board-grid">
                {items.map((item) => (
                  <ContextMenu key={item.id}>
                    <ContextMenuTrigger asChild>
                      <article className={`countdown-card${item.isCompleted ? ' countdown-card--completed' : ''}${item.coverDownloadUrl ? ' countdown-card--covered' : ''}`}>
                        {item.coverDownloadUrl ? (
                          <div className="countdown-card-visual" aria-hidden="true">
                            <img className="countdown-cover-image" src={item.coverDownloadUrl} alt={item.name} />
                            <div className="countdown-card-scrim" aria-hidden="true" />
                          </div>
                        ) : null}
                        <div className="countdown-card-content">
                          <div className="countdown-card-topline">
                            <h2 title={item.name}>{item.name}</h2>
                          </div>
                          <div className="countdown-card-count">
                            {!item.isCompleted ? <strong>{statusText(item, now)}</strong> : null}
                          </div>
                          <div className="countdown-card-footer">
                            {item.isCompleted ? (
                              <span>Complete at {formatTargetDate(item.targetDate)}</span>
                            ) : (
                              <>
                                <span>Until {formatTargetDate(item.targetDate)}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </article>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem
                        className="gap-2 text-destructive focus:text-destructive"
                        onSelect={() => setDeletingCountdown(item)}
                      >
                        <Trash2 className="size-4" />
                        <span>Delete</span>
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ))}
              </div>
            ) : (
              <p className="m-0 py-6 text-center text-sm text-muted-foreground" role="status">No {board === 'active' ? 'active' : 'completed'} countdowns.</p>
            )}
          </CardContent>
        ) : null}
      </Card>
    )
  }

  return (
    <>
      <main className="countdown-main flex h-full min-h-0 flex-col gap-3 lg:gap-4">
        <Card className="flex shrink-0 items-center justify-between px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2.5">
            <CalendarClock className="size-5 text-primary" aria-hidden="true" />
            <h1 className="m-0 text-base font-semibold tracking-tight text-foreground sm:text-lg">Countdown</h1>
          </div>
          <Button
            ref={createTriggerRef}
            type="button"
            aria-label="New Countdown"
            title="New Countdown"
            onClick={() => setShowFormModal(true)}
            className="gap-1.5"
          >
            <Plus className="size-4" />
            <span>New</span>
          </Button>
        </Card>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto lg:gap-4">
          {countdowns.length > 0 ? (
            <div className="flex flex-col gap-3 lg:gap-4">
              {renderBoard('active', 'Active', activeCountdowns)}
              {renderBoard('complete', 'Complete', completedCountdowns)}
            </div>
          ) : null}

          {!countdownsQuery.isLoading && countdowns.length === 0 ? (
            <Card className="flex min-h-0 flex-1 flex-col items-center justify-center p-8 text-center sm:p-12">
              <div className="countdown-empty-illustration mb-4" aria-hidden="true">
                <CalendarClock size={66} strokeWidth={1.5} className="text-muted-foreground" />
              </div>
              <h2 className="m-0 text-lg font-semibold sm:text-xl">No Countdowns Yet</h2>
              <p className="m-0 mt-2 max-w-md text-sm text-muted-foreground">Create your first exam, deadline, or milestone.</p>
              <Button className="mt-5 gap-1.5" type="button" onClick={() => setShowFormModal(true)}>
                <Plus size={17} />
                <span>Create First Countdown</span>
              </Button>
            </Card>
          ) : null}

          {countdownsQuery.isLoading ? <p className="status-message">Loading countdowns...</p> : null}
          {countdownsQuery.isError ? <p className="status-message status-message--error">Could not load countdowns.</p> : null}
        </div>

        {showFormModal ? (
          <div className="modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && resetForm()}>
            <div className="modal-content" role="dialog" aria-modal="true" aria-labelledby={dialogTitleId}>
              <div className="modal-header">
                <h3 id={dialogTitleId}>Create Countdown</h3>
                <button type="button" aria-label="Close countdown dialog" onClick={resetForm}><X size={20} /></button>
              </div>
              <form onSubmit={submitCountdown}>
                <label>
                  Title
                  <Input data-testid="countdown-name-input" required maxLength={50} value={name} onChange={(event) => setName(event.target.value)} placeholder="E.g., JLPT N2 Exam" />
                </label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label>
                    Target date
                    <Input data-testid="countdown-target-input" type="date" required value={targetDate} onChange={(event) => setTargetDate(event.target.value)} />
                  </label>
                  <label>
                    Cover
                    <div className="relative flex h-10 w-full items-center gap-2 rounded-md border border-input bg-card px-3 shadow-sm transition-colors hover:bg-secondary/30">
                      <ImagePlus className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate text-sm text-muted-foreground">
                        {coverFile ? coverFile.name : 'Choose file'}
                      </span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="absolute inset-0 cursor-pointer opacity-0"
                        onChange={(event) => setCoverFile(event.target.files?.[0] ?? null)}
                      />
                    </div>
                  </label>
                </div>
                {formError ? <p className="status-message status-message--error" role="alert">{formError}</p> : null}
                <div className="modal-actions">
                  <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                  <Button data-testid="save-countdown-button" type="submit" disabled={createCountdown.isPending}>
                    {createCountdown.isPending ? 'Creating...' : 'Create Countdown'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </main>
      <AlertDialog open={Boolean(deletingCountdown)} onOpenChange={(open) => { if (!open && !deleteCountdown.isPending) setDeletingCountdown(null) }}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete Countdown</AlertDialogTitle>
          <AlertDialogDescription>
            Delete “{deletingCountdown?.name}” from your Countdown lists? It will no longer appear here.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancelButton disabled={deleteCountdown.isPending}>Cancel</AlertDialogCancelButton>
            <AlertDialogActionButton
              disabled={deleteCountdown.isPending}
              onClick={(event) => {
                event.preventDefault()
                if (deletingCountdown) deleteCountdown.mutate(deletingCountdown.id)
              }}
            >
              {deleteCountdown.isPending ? 'Deleting...' : 'Delete Countdown'}
            </AlertDialogActionButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
