import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Circle,
  FolderKanban,
  ListChecks,
  Pin,
  Repeat2,
  RotateCcw,
  Timer,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { LearningAnalytics } from '@/features/analytics'
import type { Habit } from '@/features/habits'
import type { NotePageSummary } from '@/features/notes'
import type { ProjectBoardSummary } from '@/features/project'
import type { ReviewDashboardPreviewWord } from '@/features/review'
import type { TodoItem } from '@/features/todo'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { formatDateOnly } from '@/shared/lib/date'
import { cn } from '@/shared/lib/utils'

const CARD_SURFACE_CLASS =
  'flex flex-col justify-between gap-4 rounded-[16px] border border-border bg-card p-5 shadow-[0px_4px_12px_-2px_rgba(20,32,30,0.07)]'

const FOOTER_LINK_CLASS =
  'inline-flex w-fit items-center gap-1.5 px-0.5 py-1.5 text-[13px] font-semibold text-secondary-foreground transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:rounded-md'

function formatRetentionPercent(value: number) {
  const rounded = Number(value.toFixed(1))
  return `${rounded}%`
}

function formatNoteTimestamp(updatedAt: string, now: Date) {
  const parsed = new Date(updatedAt)
  if (Number.isNaN(parsed.getTime())) {
    return formatDateOnly(updatedAt, { month: 'short', day: 'numeric' })
  }

  const diffMs = now.getTime() - parsed.getTime()
  if (diffMs >= 0 && diffMs < 60_000) return 'Just now'
  if (diffMs >= 60_000 && diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m ago`
  if (diffMs >= 3_600_000 && diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}h ago`

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(parsed)
}

function CardLoadingBody({ label }: { label: string }) {
  return (
    <div className="grid gap-3 py-1" role="status" aria-label={`Loading ${label}`} aria-busy="true">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-9 w-3/4" />
    </div>
  )
}

function CardErrorBody({ label, onRetry }: { label: string; onRetry: () => void }) {
  return (
    <div className="grid gap-2 py-2" role="alert">
      <p className="m-0 text-sm text-destructive">Could not load {label}.</p>
      <button type="button" className="w-fit cursor-pointer text-sm font-medium text-primary underline" onClick={onRetry}>
        Retry loading {label}
      </button>
    </div>
  )
}

function ToggleError({ label, onRetry }: { label: string; onRetry: () => void }) {
  return (
    <div className="grid gap-1.5 pt-2" role="alert">
      <p className="m-0 text-xs text-destructive">Could not update {label}. Your previous state is unchanged.</p>
      <button type="button" className="w-fit cursor-pointer text-xs font-medium text-primary underline" onClick={onRetry}>
        Retry {label} update
      </button>
    </div>
  )
}

function CardHeader({ icon, title, badge }: { icon: ReactNode; title: ReactNode; badge?: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0 text-primary" aria-hidden="true">{icon}</span>
      <h3 className="m-0 text-[15px] font-bold leading-[22px] text-foreground">{title}</h3>
      {badge}
    </div>
  )
}

export function ReviewQueueAction() {
  const [searchParams, setSearchParams] = useSearchParams()

  function openReview() {
    if (searchParams.get('review') === 'open') return
    const nextSearchParams = new URLSearchParams(searchParams)
    nextSearchParams.set('review', 'open')
    setSearchParams(nextSearchParams)
  }

  return (
    <Button
      type="button"
      className="h-[38px] w-full rounded-[8px] bg-primary text-[13px] font-semibold text-primary-foreground shadow-[0px_1px_3px_0px_rgba(20,32,30,0.05)] hover:bg-[var(--ds-primary-hover)]"
      onClick={openReview}
    >
      <span>Open Review</span>
      <ArrowRight className="size-[15px]" aria-hidden="true" />
    </Button>
  )
}

type ReviewQueueCardProps = {
  dueReview: number
  previewWords: ReviewDashboardPreviewWord[]
  retentionPercent: number | null
  isPending: boolean
  isError: boolean
  onRetry: () => void
  className?: string
}

export function ReviewQueueCard({
  dueReview,
  previewWords,
  retentionPercent,
  isPending,
  isError,
  onRetry,
  className,
}: ReviewQueueCardProps) {
  const hasDueReview = dueReview > 0
  const visibleWords = previewWords.slice(0, 2)

  return (
    <section className={cn(CARD_SURFACE_CLASS, className)} data-testid="dashboard-widget-review">
      <div className="flex flex-col gap-3.5">
        <CardHeader icon={<RotateCcw className="size-4" />} title="Review Queue" />

        {isPending ? (
          <CardLoadingBody label="Review queue" />
        ) : isError ? (
          <CardErrorBody label="Review queue" onRetry={onRetry} />
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
            <div
              data-testid="dashboard-review-due-ring"
              className="relative grid size-[116px] shrink-0 place-items-center self-center sm:self-auto"
              aria-label={`${dueReview} ${dueReview === 1 ? 'word' : 'words'} due for review today.`}
            >
              <svg className="size-full -rotate-90" viewBox="0 0 116 116" aria-hidden="true">
                <circle cx="58" cy="58" r="48" fill="none" stroke="var(--ds-border)" strokeWidth="10" />
                <circle
                  cx="58"
                  cy="58"
                  r="48"
                  fill="none"
                  stroke="var(--ds-primary)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  pathLength="100"
                  strokeDasharray={hasDueReview ? '72 28' : '0 100'}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 text-center">
                <strong className="text-[28px] font-bold leading-none tracking-[-0.03em] text-foreground">
                  {dueReview}
                </strong>
                <span className="text-[10px] font-bold uppercase tracking-[0.6px] text-muted-foreground">
                  DUE TODAY
                </span>
              </div>
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  data-testid="dashboard-review-due-badge"
                  variant="warning"
                  className="px-2.5 py-1 text-[11px] font-bold leading-[14px]"
                >
                  {dueReview} {dueReview === 1 ? 'word' : 'words'} ready
                </Badge>
                {retentionPercent !== null ? (
                  <Badge
                    data-testid="dashboard-review-retention-badge"
                    variant="success"
                    className="px-2.5 py-1 text-[11px] font-bold leading-[14px]"
                  >
                    {formatRetentionPercent(retentionPercent)} retention
                  </Badge>
                ) : null}
              </div>

              {hasDueReview && visibleWords.length > 0 ? (
                <ul className="m-0 flex list-none flex-col gap-2 p-0">
                  {visibleWords.map((word) => (
                    <li
                      key={word.wordId}
                      className="flex items-center justify-between gap-2 rounded-[8px] border border-border bg-muted px-2.5 py-[7px]"
                    >
                      <span className="min-w-0 truncate text-[12px] font-semibold text-foreground">{word.word}</span>
                      <span className="shrink-0 font-mono text-[11px] text-secondary-foreground">
                        {word.ipaPronunciation}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : !hasDueReview ? (
                <p className="m-0 text-[12px] text-muted-foreground">No reviews due today.</p>
              ) : null}

              <p className="m-0 text-[12px] text-muted-foreground">
                Scheduled reviews stay separate from new words.
              </p>
            </div>
          </div>
        )}
      </div>

      <ReviewQueueAction />
    </section>
  )
}

type TodoCardProps = {
  todos: TodoItem[]
  isPending: boolean
  isError: boolean
  onRetry: () => void
  isMutating: boolean
  toggleError: boolean
  onToggle: (todo: TodoItem) => void
  onRetryToggle: () => void
  className?: string
}

export function TodoCard({
  todos,
  isPending,
  isError,
  onRetry,
  isMutating,
  toggleError,
  onToggle,
  onRetryToggle,
  className,
}: TodoCardProps) {
  const visibleTodos = todos.slice(0, 3)
  const remainingCount = todos.filter((todo) => !todo.isCompleted).length

  return (
    <section className={cn(CARD_SURFACE_CLASS, className)} data-testid="dashboard-widget-todo">
      <div className="flex flex-col gap-3.5">
        <CardHeader
          icon={<ListChecks className="size-4" />}
          title="Todo"
          badge={!isPending && !isError ? (
            <Badge variant="neutral" className="px-2.5 py-1 text-[11px] font-bold leading-[14px]">
              {remainingCount} left
            </Badge>
          ) : undefined}
        />

        {isPending ? (
          <CardLoadingBody label="Todo" />
        ) : isError ? (
          <CardErrorBody label="Todo" onRetry={onRetry} />
        ) : (
          <div>
            {visibleTodos.length > 0 ? (
              <ul className="m-0 flex list-none flex-col gap-2 p-0" role="list">
                {visibleTodos.map((todo) => (
                  <li key={todo.id}>
                    <button
                      type="button"
                      disabled={isMutating}
                      aria-label={`${todo.isCompleted ? 'Uncheck' : 'Check'} todo ${todo.title}`}
                      onClick={() => onToggle(todo)}
                      className={cn(
                        'flex w-full cursor-pointer items-center gap-2.5 rounded-[10px] border border-border px-3 py-[9px] text-left text-[13px] transition-colors disabled:cursor-wait disabled:opacity-60',
                        todo.isCompleted
                          ? 'bg-card font-normal text-muted-foreground line-through hover:border-primary/25'
                          : 'bg-muted font-semibold text-foreground hover:border-primary/35',
                      )}
                    >
                      {todo.isCompleted ? (
                        <CheckCircle2 className="size-4 shrink-0 text-primary" aria-hidden="true" />
                      ) : (
                        <Circle className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      )}
                      <span className="min-w-0 truncate">{todo.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="grid min-h-[120px] place-content-center text-center">
                <CheckCircle2 className="mx-auto mb-2 size-6 text-muted-foreground" aria-hidden="true" />
                <p className="m-0 text-sm text-muted-foreground">No tasks for today.</p>
              </div>
            )}

            {toggleError ? <ToggleError label="Todo" onRetry={onRetryToggle} /> : null}
          </div>
        )}
      </div>

      <Link to="/todo" className={FOOTER_LINK_CLASS}>
        <span>View all tasks</span>
        <ArrowRight className="size-3.5" aria-hidden="true" />
      </Link>
    </section>
  )
}

type CountdownCardProps = {
  countdown?: { name: string; targetDate: string }
  remainingText: (targetDate: string) => string
  isPending: boolean
  isError: boolean
  onRetry: () => void
  className?: string
}

export function CountdownCard({
  countdown,
  remainingText,
  isPending,
  isError,
  onRetry,
  className,
}: CountdownCardProps) {
  return (
    <section className={cn(CARD_SURFACE_CLASS, className)} data-testid="dashboard-widget-countdown">
      <div className="flex flex-col gap-3.5">
        <CardHeader icon={<CalendarClock className="size-4" />} title="Countdowns" />

        {isPending ? (
          <CardLoadingBody label="Countdowns" />
        ) : isError ? (
          <CardErrorBody label="Countdowns" onRetry={onRetry} />
        ) : (
          <div className="flex flex-col items-center justify-center gap-1.5 rounded-[12px] border border-primary bg-secondary px-4 py-[26px] text-center">
            <p className="m-0 text-[28px] font-bold leading-tight tracking-[-0.03em] text-secondary-foreground">
              {countdown ? remainingText(countdown.targetDate) : '--:--'}
            </p>
            <p className="m-0 max-w-full truncate text-[14px] font-semibold text-foreground">
              {countdown?.name ?? 'No upcoming events'}
            </p>
            {countdown ? (
              <time className="text-[12px] text-muted-foreground" dateTime={countdown.targetDate}>
                Until {formatDateOnly(countdown.targetDate, { month: 'long', day: 'numeric', year: 'numeric' })}
              </time>
            ) : null}
          </div>
        )}
      </div>

      <Button
        asChild
        variant="outline"
        className="h-[38px] w-full rounded-[8px] border-input bg-card text-[13px] font-semibold text-foreground shadow-[0px_1px_3px_0px_rgba(20,32,30,0.05)]"
      >
        <Link to="/countdowns">
          <Timer className="size-[15px]" aria-hidden="true" />
          <span>Open Countdowns</span>
        </Link>
      </Button>
    </section>
  )
}

type HabitTrackerCardProps = {
  habits: Habit[]
  isPending: boolean
  isError: boolean
  onRetry: () => void
  isMutating: boolean
  toggleError: boolean
  onToggle: (habit: Habit) => void
  onRetryToggle: () => void
  className?: string
}

export function HabitTrackerCard({
  habits,
  isPending,
  isError,
  onRetry,
  isMutating,
  toggleError,
  onToggle,
  onRetryToggle,
  className,
}: HabitTrackerCardProps) {
  const checkedCount = habits.filter((habit) => habit.isCheckedToday).length
  const visibleHabits = habits.slice(0, 3)

  return (
    <section className={cn(CARD_SURFACE_CLASS, className)} data-testid="dashboard-widget-habits">
      <div className="flex flex-col gap-3">
        <CardHeader
          icon={<Repeat2 className="size-4" />}
          title="Habit Tracker"
          badge={!isPending && !isError ? (
            <Badge variant="default" className="px-2.5 py-1 text-[11px] font-bold leading-[14px]">
              {checkedCount} / {habits.length} today
            </Badge>
          ) : undefined}
        />

        {isPending ? (
          <CardLoadingBody label="Habit tracker" />
        ) : isError ? (
          <CardErrorBody label="Habit tracker" onRetry={onRetry} />
        ) : (
          <div>
            {visibleHabits.length > 0 ? (
              <div className="flex flex-col gap-2">
                {visibleHabits.map((habit) => (
                  <button
                    key={habit.id}
                    type="button"
                    disabled={isMutating}
                    aria-label={`${habit.isCheckedToday ? 'Uncheck' : 'Check'} habit ${habit.name}`}
                    onClick={() => onToggle(habit)}
                    className={cn(
                      'flex w-full cursor-pointer flex-col gap-[7px] rounded-[10px] border border-border px-3 py-[9px] text-left transition-colors hover:border-primary/35 disabled:cursor-wait disabled:opacity-60',
                      habit.isCheckedToday ? 'bg-muted' : 'bg-card',
                    )}
                  >
                    <span className="flex w-full items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-[7px]">
                        {habit.isCheckedToday ? (
                          <CheckCircle2 className="size-[15px] shrink-0 text-primary" aria-hidden="true" />
                        ) : (
                          <Circle className="size-[15px] shrink-0 text-muted-foreground" aria-hidden="true" />
                        )}
                        <span className="min-w-0 truncate text-[13px] font-semibold text-foreground">{habit.name}</span>
                      </span>
                      <span
                        className={cn(
                          'shrink-0 text-[11px] font-semibold',
                          habit.isCheckedToday ? 'text-secondary-foreground' : 'text-muted-foreground',
                        )}
                      >
                        {habit.currentStreak} day streak
                      </span>
                    </span>
                    <span className="h-[5px] w-full overflow-hidden rounded-full bg-border">
                      <span
                        className={cn(
                          'block h-full rounded-full bg-primary transition-[width] duration-200',
                          habit.isCheckedToday ? 'w-full' : 'w-0',
                        )}
                      />
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid min-h-[140px] place-content-center text-center">
                <Repeat2 className="mx-auto mb-2 size-6 text-muted-foreground" aria-hidden="true" />
                <p className="m-0 text-sm text-muted-foreground">No habits scheduled today.</p>
              </div>
            )}

            {toggleError ? <ToggleError label="Habit" onRetry={onRetryToggle} /> : null}
          </div>
        )}
      </div>

      <Link to="/habits" className={FOOTER_LINK_CLASS}>
        <span>Open Habits</span>
        <ArrowRight className="size-3.5" aria-hidden="true" />
      </Link>
    </section>
  )
}

type ProjectsCardProps = {
  boards: ProjectBoardSummary[]
  isPending: boolean
  isError: boolean
  onRetry: () => void
  className?: string
}

export function ProjectsCard({
  boards,
  isPending,
  isError,
  onRetry,
  className,
}: ProjectsCardProps) {
  const totalCards = boards.reduce((sum, board) => sum + board.cardCount, 0)
  const visibleBoards = boards.slice(0, 2)

  return (
    <section className={cn(CARD_SURFACE_CLASS, className)} data-testid="dashboard-widget-project">
      <div className="flex flex-col gap-3">
        <CardHeader icon={<FolderKanban className="size-4" />} title="Projects" />

        {isPending ? (
          <CardLoadingBody label="Project" />
        ) : isError ? (
          <CardErrorBody label="Project" onRetry={onRetry} />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="flex flex-col gap-0.5 rounded-[10px] border border-border bg-muted px-3 py-2.5">
                <span className="text-[11px] font-semibold text-muted-foreground">Boards</span>
                <strong className="text-[20px] font-bold leading-snug tracking-[-0.02em] text-foreground">
                  {boards.length}
                </strong>
              </div>
              <div className="flex flex-col gap-0.5 rounded-[10px] border border-border bg-muted px-3 py-2.5">
                <span className="text-[11px] font-semibold text-muted-foreground">Cards</span>
                <strong className="text-[20px] font-bold leading-snug tracking-[-0.02em] text-foreground">
                  {totalCards}
                </strong>
              </div>
            </div>

            {visibleBoards.length > 0 ? (
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {visibleBoards.map((board) => (
                  <li key={board.id}>
                    <Link
                      to="/project"
                      className="flex items-center justify-between gap-2 rounded-[8px] border border-border bg-muted px-3 py-[9px] text-[13px] font-semibold text-foreground transition-colors hover:border-primary/35"
                    >
                      <span className="min-w-0 truncate">{board.name}</span>
                      <span className="shrink-0 text-[11px] font-semibold text-muted-foreground">
                        {board.cardCount} {board.cardCount === 1 ? 'card' : 'cards'}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="m-0 text-sm text-muted-foreground">No project boards yet.</p>
            )}
          </>
        )}
      </div>

      <div className="flex w-full justify-end">
        <Link to="/project" className={FOOTER_LINK_CLASS}>
          <span>All Projects</span>
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
    </section>
  )
}

type JournalCardProps = {
  streakDays: number
  notes: NotePageSummary[]
  now: Date
  isPending: boolean
  isError: boolean
  onRetry: () => void
  className?: string
}

export function JournalCard({
  streakDays,
  notes,
  now,
  isPending,
  isError,
  onRetry,
  className,
}: JournalCardProps) {
  const visibleNotes = notes.slice(0, 2)

  return (
    <section className={cn(CARD_SURFACE_CLASS, className)} data-testid="dashboard-widget-journal">
      <div className="flex flex-col gap-3">
        <CardHeader
          icon={<BookOpen className="size-4" />}
          title={
            <Link to="/journal" className="text-foreground transition-colors hover:text-primary hover:underline">
              Journal
            </Link>
          }
          badge={!isPending && !isError ? (
            <Badge variant="default" className="px-2.5 py-1 text-[11px] font-bold leading-[14px]">
              {streakDays}-day streak
            </Badge>
          ) : undefined}
        />

        {isPending ? (
          <CardLoadingBody label="Journal and Notes" />
        ) : isError ? (
          <CardErrorBody label="Journal and Notes" onRetry={onRetry} />
        ) : visibleNotes.length > 0 ? (
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {visibleNotes.map((note) => (
              <li key={note.id}>
                <Link
                  to="/notes"
                  className="flex items-center justify-between gap-2 rounded-[8px] border border-border bg-card px-2.5 py-[7px] transition-colors hover:border-primary/35"
                >
                  <span className="flex min-w-0 items-center gap-[7px]">
                    <Pin className="size-[13px] shrink-0 text-primary" aria-hidden="true" />
                    <span className="min-w-0 truncate text-[12px] font-semibold text-foreground">{note.name}</span>
                  </span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {formatNoteTimestamp(note.updatedAt, now)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="grid min-h-[96px] place-content-center text-center">
            <BookOpen className="mx-auto mb-2 size-6 text-muted-foreground" aria-hidden="true" />
            <p className="m-0 text-sm text-muted-foreground">No notes yet.</p>
          </div>
        )}
      </div>

      <div className="flex w-full justify-end">
        <Link to="/notes" className={FOOTER_LINK_CLASS}>
          <span>All Notes</span>
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
    </section>
  )
}

function buildMiniBars(analytics?: LearningAnalytics) {
  const days = (analytics?.consistencyDays ?? []).slice(-7)
  const padded = days.length < 7
    ? [
        ...Array.from({ length: 7 - days.length }, (_, index) => ({
          key: `empty-${index}`,
          activityCount: 0,
          intensityLevel: 0,
        })),
        ...days.map((day) => ({ key: day.date, activityCount: day.activityCount, intensityLevel: day.intensityLevel })),
      ]
    : days.map((day) => ({ key: day.date, activityCount: day.activityCount, intensityLevel: day.intensityLevel }))

  const maxActivity = Math.max(1, ...padded.map((day) => day.activityCount))

  return padded.map((day) => {
    if (day.activityCount <= 0) {
      return { key: day.key, heightPx: 6, colorClass: 'bg-[#dce5e2]' }
    }
    const heightPx = Math.round(10 + (day.activityCount / maxActivity) * 22)
    const colorClass = day.intensityLevel >= 3
      ? 'bg-[#0f766e]'
      : day.intensityLevel === 2
        ? 'bg-[#14b8a6]'
        : 'bg-[#5eead4]'
    return { key: day.key, heightPx, colorClass }
  })
}

type LearningPulseCardProps = {
  analytics?: LearningAnalytics
  isPending: boolean
  isError: boolean
  onRetry: () => void
}

export function LearningPulseCard({
  analytics,
  isPending,
  isError,
  onRetry,
}: LearningPulseCardProps) {
  const bars = buildMiniBars(analytics)
  const retentionText = analytics?.retention.ratePercent != null
    ? formatRetentionPercent(analytics.retention.ratePercent)
    : '—'
  const masteredText = analytics
    ? `${analytics.mastery.masteredCount} / ${analytics.mastery.totalWords}`
    : '—'
  const streakText = analytics
    ? `${analytics.streak.currentDays} ${analytics.streak.currentDays === 1 ? 'day' : 'days'}`
    : '—'

  return (
    <section
      data-testid="dashboard-widget-learning-pulse"
      className="flex flex-wrap items-center justify-between gap-4 rounded-[16px] border border-border bg-card px-6 py-4 shadow-[0px_4px_12px_-2px_rgba(20,32,30,0.07)]"
    >
      <div className="flex items-center gap-3">
        <span className="grid size-[38px] shrink-0 place-items-center rounded-[10px] border border-primary bg-secondary text-primary">
          <BarChart3 className="size-[18px]" aria-hidden="true" />
        </span>
        <h3 className="m-0 text-[15px] font-bold leading-[22px] text-foreground">Learning Pulse</h3>
      </div>

      {isPending ? (
        <div className="flex items-center gap-3" role="status" aria-label="Loading Learning Pulse" aria-busy="true">
          <Skeleton className="h-9 w-48" />
        </div>
      ) : isError ? (
        <div className="flex items-center gap-3" role="alert">
          <span className="text-sm text-destructive">Could not load Learning Pulse.</span>
          <button type="button" className="cursor-pointer text-sm font-medium text-primary underline" onClick={onRetry}>
            Retry loading Learning Pulse
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex flex-col gap-px">
            <strong className="text-[18px] font-bold leading-tight text-foreground">{retentionText}</strong>
            <span className="text-[11px] text-muted-foreground">Retention</span>
          </div>

          <div className="h-8 w-px bg-border" aria-hidden="true" />

          <div className="flex flex-col gap-px">
            <strong className="text-[18px] font-bold leading-tight text-foreground">{masteredText}</strong>
            <span className="text-[11px] text-muted-foreground">Mastered</span>
          </div>

          <div className="h-8 w-px bg-border" aria-hidden="true" />

          <div className="flex flex-col gap-px">
            <strong className="text-[18px] font-bold leading-tight text-secondary-foreground">{streakText}</strong>
            <span className="text-[11px] text-muted-foreground">Study Streak</span>
          </div>

          <div className="h-8 w-px bg-border" aria-hidden="true" />

          <div className="flex h-8 items-end gap-[5px]" aria-label="7-day study activity">
            {bars.map((bar) => (
              <span
                key={bar.key}
                data-testid="learning-pulse-bar"
                style={{ height: `${bar.heightPx}px` }}
                className={cn('w-[8px] shrink-0 rounded-[3px]', bar.colorClass)}
              />
            ))}
          </div>
        </div>
      )}

      <Link to="/analytics" className={FOOTER_LINK_CLASS}>
        <span>View Analytics</span>
        <ArrowRight className="size-3.5" aria-hidden="true" />
      </Link>
    </section>
  )
}
