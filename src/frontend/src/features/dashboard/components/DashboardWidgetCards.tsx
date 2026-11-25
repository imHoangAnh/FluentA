import { ArrowRight, BookOpenCheck, CheckCircle2, Circle, FolderKanban, Repeat2, Timer } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { CardContent } from '@/shared/components/ui/card'
import { cn } from '@/shared/lib/utils'
import { formatDateOnly } from '@/shared/lib/date'
import * as habitApi from '@/features/habits'
import * as todoApi from '@/features/todo'
import type { ProjectBoardSummary } from '@/features/project'
import { HabitIconGlyph } from '@/features/habits'

type ReviewQueueWidgetProps = {
  dueReview: number
}

export function ReviewQueueWidget({ dueReview }: ReviewQueueWidgetProps) {
  const hasDueReview = dueReview > 0
  return (
    <CardContent className="grid gap-4 p-4 sm:grid-cols-[136px_minmax(0,1fr)] sm:gap-5 sm:p-5">
      <div className="flex items-center justify-between gap-3 sm:block">
        <div
          data-testid="dashboard-review-due-ring"
          className="relative grid size-28 shrink-0 place-items-center rounded-full bg-[radial-gradient(circle_at_center,var(--ds-card)_58%,var(--ds-secondary)_100%)] sm:mx-auto sm:size-32"
          aria-label={`${dueReview} ${dueReview === 1 ? 'word' : 'words'} due for review today.`}
        >
          <svg className="absolute inset-0 size-full -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="44" fill="none" stroke="var(--ds-muted)" strokeWidth="7" />
            <circle cx="50" cy="50" r="44" fill="none" stroke="var(--ds-primary)" strokeWidth="7" strokeLinecap="round" pathLength="100" strokeDasharray={hasDueReview ? '74 26' : '0 100'} />
          </svg>
          <div className="relative grid place-items-center gap-1 text-center">
            <BookOpenCheck className="size-4 text-primary" aria-hidden="true" />
            <strong className="text-3xl leading-none tracking-[-0.04em] text-foreground">{dueReview}</strong>
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Due today</span>
          </div>
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        <Badge data-testid="dashboard-review-due-badge" variant={hasDueReview ? 'default' : 'outline'} className="w-fit shrink-0">{dueReview} due</Badge>
        <div data-testid="dashboard-review-count" className="rounded-xl border border-primary/15 bg-secondary/65 p-3">
          <div className="flex items-center gap-2 text-xs font-medium text-secondary-foreground"><BookOpenCheck className="size-4" aria-hidden="true" />Review</div>
          <p className="m-0 mt-1.5 text-xl font-bold tracking-[-0.03em] text-foreground">{dueReview}</p>
          <p className="m-0 mt-0.5 text-xs text-muted-foreground">Scheduled words</p>
        </div>
        <p className="m-0 text-sm text-muted-foreground">{hasDueReview ? `${dueReview} ${dueReview === 1 ? 'word is' : 'words are'} ready for spaced review.` : 'No reviews due today.'}</p>
      </div>
    </CardContent>
  )
}

type TodoWidgetProps = {
  todos: todoApi.TodoItem[]
  onToggle: (todo: todoApi.TodoItem) => void
  isPending?: boolean
}

export function TodoWidget({ todos, onToggle, isPending = false }: TodoWidgetProps) {
  const visibleTodos = todos.slice(0, 3)
  return (
    <CardContent className="flex min-h-0 flex-col gap-3 p-4 sm:p-5">
      <ul className="m-0 grid list-none gap-1.5 p-0" role="list">
        {visibleTodos.map((todo) => (
          <li key={todo.id}>
            <button type="button" disabled={isPending} className={cn('flex min-h-10 w-full cursor-pointer items-center gap-3 rounded-lg border border-transparent px-2.5 text-left text-sm transition-colors hover:border-border/70 hover:bg-muted/50 disabled:cursor-wait disabled:opacity-60', todo.isCompleted && 'text-muted-foreground line-through')} aria-label={`${todo.isCompleted ? 'Uncheck' : 'Check'} todo ${todo.title}`} onClick={() => onToggle(todo)}>
              {todo.isCompleted ? <CheckCircle2 className="size-[18px] shrink-0 text-primary" /> : <Circle className="size-[18px] shrink-0 text-muted-foreground" />}
              <span className="min-w-0 truncate">{todo.title}</span>
            </button>
          </li>
        ))}
      </ul>
      {todos.length === 0 ? <div className="grid min-h-20 flex-1 place-content-center text-center"><CheckCircle2 className="mx-auto mb-2 size-7 text-muted-foreground" /><p className="m-0 text-sm text-muted-foreground">No tasks for today.</p></div> : null}
    </CardContent>
  )
}

type CountdownWidgetProps = {
  countdown?: { name: string; targetDate: string }
  remainingText: (targetDate: string) => string
}

export function CountdownWidget({ countdown, remainingText }: CountdownWidgetProps) {
  return (
    <CardContent className="p-4 sm:p-5">
      <div className="rounded-xl border border-primary/15 bg-secondary/75 p-4 text-center sm:p-5">
        <p className="m-0 text-2xl font-bold tracking-[-0.03em] text-secondary-foreground sm:text-3xl">{countdown ? remainingText(countdown.targetDate) : '--:--'}</p>
        <p className="m-0 mt-2 truncate text-sm font-medium text-foreground">{countdown?.name ?? 'No upcoming events'}</p>
        {countdown ? <time className="mt-1 block text-xs text-muted-foreground" dateTime={countdown.targetDate}>Until {formatDateOnly(countdown.targetDate)}</time> : null}
      </div>
    </CardContent>
  )
}

type HabitWidgetProps = {
  habits: habitApi.Habit[]
  onToggle: (habit: habitApi.Habit) => void
  isPending?: boolean
}

export function HabitWidget({ habits, onToggle, isPending = false }: HabitWidgetProps) {
  return (
    <CardContent className="grid gap-2.5 p-4 sm:p-5">
      {habits.map((habit) => (
        <button type="button" key={habit.id} disabled={isPending} className="grid min-h-11 cursor-pointer grid-cols-[1fr_auto] items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-left transition-colors hover:border-primary/35 hover:bg-secondary/40 disabled:cursor-wait disabled:opacity-60" aria-label={`${habit.isCheckedToday ? 'Uncheck' : 'Check'} habit ${habit.name}`} onClick={() => onToggle(habit)}>
          <span className="flex min-w-0 items-center gap-2 truncate text-sm font-medium"><HabitIconGlyph icon={habit.icon} size={16} /> {habit.name}</span>
          <span className="text-xs font-semibold text-muted-foreground">{habit.currentStreak} day streak</span>
          <span className="col-span-2 h-1.5 overflow-hidden rounded-full bg-muted"><span className={cn('block h-full rounded-full bg-primary transition-[width] duration-200', habit.isCheckedToday ? 'w-full' : 'w-0')} /></span>
        </button>
      ))}
      {habits.length === 0 ? <div className="grid min-h-20 place-content-center text-center"><Repeat2 className="mx-auto mb-2 size-7 text-muted-foreground" /><p className="m-0 text-sm text-muted-foreground">No habits scheduled today.</p></div> : null}
    </CardContent>
  )
}

type ProjectWidgetProps = {
  boards: ProjectBoardSummary[]
}

export function ProjectWidget({ boards }: ProjectWidgetProps) {
  const totalCards = boards.reduce((sum, board) => sum + board.cardCount, 0)
  return (
    <CardContent className="flex min-h-0 flex-col gap-3 p-4 sm:p-5">
      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-xl border border-border bg-muted/45 p-3"><p className="m-0 text-xs font-medium text-muted-foreground">Boards</p><strong className="mt-1 block text-2xl font-bold tracking-[-0.03em] text-foreground">{boards.length}</strong></div>
        <div className="rounded-xl border border-border bg-muted/45 p-3"><p className="m-0 text-xs font-medium text-muted-foreground">Cards</p><strong className="mt-1 block text-2xl font-bold tracking-[-0.03em] text-foreground">{totalCards}</strong></div>
      </div>
      {boards.length > 0 ? <ul className="m-0 grid list-none gap-1.5 p-0 text-sm">{boards.slice(0, 3).map((board) => <li key={board.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/25 px-3 py-2"><span className="min-w-0 truncate font-medium text-foreground">{board.name}</span><span className="shrink-0 text-xs font-medium text-muted-foreground">{board.cardCount} cards</span></li>)}</ul> : <p className="m-0 text-sm text-muted-foreground">No project boards yet.</p>}
    </CardContent>
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

  return <Button type="button" className="w-full justify-between" onClick={openReview}>Open Review<ArrowRight className="size-4" aria-hidden="true" /></Button>
}

export function TodoAction() {
  return <Button asChild variant="ghost" size="sm" className="w-full justify-start"><Link to="/todo">View all tasks</Link></Button>
}

export function CountdownAction() {
  return <Button asChild variant="outline" className="w-full"><Link to="/countdowns"><Timer /> Open countdowns</Link></Button>
}

export function ProjectAction() {
  return <Button asChild variant="outline" className="w-full"><Link to="/project"><FolderKanban /> Open Project</Link></Button>
}
