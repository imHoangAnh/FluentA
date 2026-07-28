import { ArrowRight, BookOpenCheck, CalendarClock, Check, CheckCircle2, Circle, GraduationCap, Timer, TrendingUp } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Skeleton } from '@/shared/components/ui/skeleton'
import * as countdownApi from '@/features/countdown'
import * as habitApi from '@/features/habits'
import * as todoApi from '@/features/todo'
import { HabitIconGlyph } from '@/features/habits'
import { useAuthStore } from '@/features/auth'
import { getReviewDashboard } from '@/features/review'
import { cn } from '@/shared/lib/utils'

const preloadJournalEditor = () => import('@/features/journal')

function browserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

function toDateInput(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function greeting(hour: number, name: string) {
  if (hour >= 5 && hour < 12) return `Good morning 🌅, ${name}`
  if (hour >= 12 && hour < 17) return `Good afternoon ☀️, ${name}`
  if (hour >= 17 && hour < 21) return `Good evening 🌇, ${name}`
  return `Good night 🌙 , ${name}`
}

function remainingText(targetDate: string, now: Date) {
  const diff = new Date(targetDate).getTime() - now.getTime()
  if (diff <= 0) return 'Completed'
  const totalHours = Math.floor(diff / 3_600_000)
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24
  if (days > 0) return `${days} days ${hours}h`
  return `${hours} hours`
}

export function DashboardPage() {
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const [now, setNow] = useState(() => new Date())

  const today = useMemo(() => toDateInput(new Date()), [])
  const timeZoneId = useMemo(() => browserTimeZone(), [])
  const displayName = user?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'Learner'

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 60_000)
    void preloadJournalEditor()
    return () => window.clearInterval(intervalId)
  }, [])

  const todosQuery = useQuery({ queryKey: ['todo', 'items', today], queryFn: () => todoApi.listByDate(today) })
  const habitsQuery = useQuery({ queryKey: ['habit', 'list', timeZoneId], queryFn: () => habitApi.listHabits(timeZoneId) })
  const countdownsQuery = useQuery({ queryKey: ['countdown', 'events'], queryFn: countdownApi.listCountdowns })
  const flashcardDashboardQuery = useQuery({ queryKey: ['review', 'dashboard'], queryFn: () => getReviewDashboard(timeZoneId) })

  const todoToggle = useMutation({
    mutationFn: (todo: todoApi.TodoItem) => todoApi.updateTodo(todo.id, { isCompleted: !todo.isCompleted }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['todo'] }) },
  })

  const habitToggle = useMutation({
    mutationFn: (habit: habitApi.Habit) => habitApi.toggleHabitEntry(habit.id, today, timeZoneId),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['habit'] }) },
  })

  const todos = useMemo(
    () => (todosQuery.data ?? []).toSorted((left, right) =>
      Number(left.isCompleted) - Number(right.isCompleted)
      || (left.completedAt ?? left.createdAt).localeCompare(right.completedAt ?? right.createdAt)),
    [todosQuery.data],
  )
  const visibleTodos = todos.slice(0, 3)
  const habits = useMemo(() => (habitsQuery.data ?? []).filter((habit) => habit.isScheduledToday).slice(0, 3), [habitsQuery.data])
  const countdowns = useMemo(() => (countdownsQuery.data ?? []).toSorted((left, right) => new Date(left.targetDate).getTime() - new Date(right.targetDate).getTime()).slice(0, 1), [countdownsQuery.data])
  const flashcardDashboard = flashcardDashboardQuery.data
  const dueReview = (flashcardDashboard?.overdue ?? 0) + (flashcardDashboard?.dueToday ?? 0)
  const learningCards = flashcardDashboard?.newCards ?? 0
  const hasDueReview = dueReview > 0
  const isLoading = todosQuery.isLoading || habitsQuery.isLoading || countdownsQuery.isLoading || flashcardDashboardQuery.isLoading

  return (
    <>
      <section className="mb-6 flex flex-wrap items-end justify-between gap-4" aria-labelledby="welcome-heading">
        <div>
          <h2 id="welcome-heading" className="m-0 text-3xl font-semibold tracking-[-0.035em] text-foreground">{greeting(now.getHours(), displayName)}</h2>
          <p className="m-0 mt-2 text-sm text-muted-foreground">
            {new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(now)}
          </p>
        </div>
      </section>

      {isLoading ? (
        <div className="grid grid-cols-12 gap-4" aria-label="Loading dashboard" aria-busy="true">
          <Skeleton className="col-span-8 h-80 max-xl:col-span-12" />
          <Skeleton className="col-span-4 h-80 max-xl:col-span-12" />
          <Skeleton className="col-span-6 h-56 max-xl:col-span-12" />
          <Skeleton className="col-span-6 h-56 max-xl:col-span-12" />
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-3">
          <Card className="col-span-6 overflow-hidden max-xl:col-span-12">
            <CardHeader className="flex-row items-start justify-between gap-4 pb-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-secondary-foreground" aria-hidden="true">
                  <BookOpenCheck className="size-5" />
                </span>
                <div className="min-w-0">
                  <CardTitle>Review queue</CardTitle>
                  <CardDescription className="mt-1">Scheduled reviews stay separate from new words.</CardDescription>
                </div>
              </div>
              <Badge data-testid="dashboard-review-due-badge" variant={hasDueReview ? 'default' : 'outline'} className="shrink-0">{dueReview} due</Badge>
            </CardHeader>
            <CardContent className="grid grid-cols-[152px_minmax(0,1fr)] items-stretch gap-6 max-sm:grid-cols-1">
              <div
                data-testid="dashboard-review-due-ring"
                className="relative mx-auto grid size-36 place-items-center rounded-full bg-[radial-gradient(circle_at_center,var(--ds-card)_58%,var(--ds-secondary)_100%)]"
                aria-label={`${dueReview} ${dueReview === 1 ? 'word' : 'words'} due for review today. ${learningCards} new ${learningCards === 1 ? 'word' : 'words'} available to learn.`}
              >
                <svg className="absolute inset-0 size-full -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
                  <circle cx="50" cy="50" r="44" fill="none" stroke="var(--ds-muted)" strokeWidth="7" />
                  <circle
                    cx="50"
                    cy="50"
                    r="44"
                    fill="none"
                    stroke="var(--ds-primary)"
                    strokeWidth="7"
                    strokeLinecap="round"
                    pathLength="100"
                    strokeDasharray={hasDueReview ? '74 26' : '0 100'}
                  />
                </svg>
                <div className="relative grid place-items-center gap-1 text-center">
                  <BookOpenCheck className="size-5 text-primary" aria-hidden="true" />
                  <strong className="text-4xl leading-none tracking-[-0.04em] text-foreground">{dueReview}</strong>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Due today</span>
                </div>
              </div>
              <div className="flex min-w-0 flex-col gap-3">
                <div className="grid grid-cols-2 gap-3 max-[420px]:grid-cols-1">
                  <div data-testid="dashboard-review-count" className="rounded-lg border border-primary/15 bg-secondary/65 p-3.5">
                    <div className="flex items-center gap-2 text-xs font-medium text-secondary-foreground"><BookOpenCheck className="size-4" aria-hidden="true" />Review</div>
                    <p className="m-0 mt-2 text-2xl font-semibold tracking-[-0.03em] text-foreground">{dueReview}</p>
                    <p className="m-0 mt-0.5 text-xs text-muted-foreground">Scheduled words</p>
                  </div>
                  <div data-testid="dashboard-learning-count" className="rounded-lg border border-border bg-muted/45 p-3.5">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><GraduationCap className="size-4" aria-hidden="true" />Learning</div>
                    <p className="m-0 mt-2 text-2xl font-semibold tracking-[-0.03em] text-foreground">{learningCards}</p>
                    <p className="m-0 mt-0.5 text-xs text-muted-foreground">New words</p>
                  </div>
                </div>
                <p className="m-0 text-sm text-muted-foreground">
                  {hasDueReview
                    ? `${dueReview} ${dueReview === 1 ? 'word is' : 'words are'} ready for spaced review.`
                    : 'No reviews due today.'}
                </p>
                <Button asChild className="mt-auto w-full justify-between"><Link to="/review">Open Review<ArrowRight className="size-4" aria-hidden="true" /></Link></Button>
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-6 max-xl:col-span-12">
            <CardHeader className="flex-row items-start justify-between"><div><CardTitle>Daily todo</CardTitle><CardDescription>Your three most relevant tasks.</CardDescription></div><Check className="size-5 text-primary" /></CardHeader>
            <CardContent className="flex h-[226px] flex-col">
              <ul className="m-0 grid list-none gap-2 p-0" role="list">
                {visibleTodos.map((todo) => (
                  <li key={todo.id}>
                    <button
                      type="button"
                      className={cn('flex min-h-10 w-full cursor-pointer items-center gap-3 rounded-md border border-transparent px-2 text-left text-sm transition-colors hover:bg-accent', todo.isCompleted && 'text-muted-foreground line-through')}
                      aria-label={`${todo.isCompleted ? 'Uncheck' : 'Check'} todo ${todo.title}`}
                      onClick={() => todoToggle.mutate(todo)}
                    >
                      {todo.isCompleted ? <CheckCircle2 className="size-[18px] text-primary" /> : <Circle className="size-[18px] text-muted-foreground" />}
                      <span>{todo.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
              {todos.length === 0 ? <div className="grid flex-1 place-content-center text-center"><CheckCircle2 className="mx-auto mb-2 size-7 text-muted-foreground" /><p className="m-0 text-sm text-muted-foreground">No tasks for today.</p></div> : null}
              <Button asChild variant="ghost" size="sm" className="mt-auto self-start"><Link to="/todo">View all tasks</Link></Button>
            </CardContent>
          </Card>

          <Card className="col-span-5 max-xl:col-span-12">
            <CardHeader className="flex-row items-start justify-between"><div><CardTitle>Next event</CardTitle><CardDescription>Keep the nearest milestone in view.</CardDescription></div><CalendarClock className="size-5 text-primary" /></CardHeader>
            <CardContent>
              <div className="rounded-lg bg-secondary p-5 text-center">
                <p className="m-0 text-3xl font-semibold tracking-[-0.03em] text-secondary-foreground">{countdowns.length ? remainingText(countdowns[0].targetDate, now) : '--:--'}</p>
                <p className="m-0 mt-2 text-sm text-muted-foreground">{countdowns[0]?.name ?? 'No upcoming events'}</p>
              </div>
              <Button asChild variant="outline" className="mt-4 w-full"><Link to="/countdowns"><Timer /> Open countdowns</Link></Button>
            </CardContent>
          </Card>

          <Card className="col-span-7 max-xl:col-span-12">
            <CardHeader className="flex-row items-start justify-between"><div><CardTitle>Habit tracker</CardTitle><CardDescription>Small actions that keep your learning rhythm alive.</CardDescription></div><TrendingUp className="size-5 text-primary" /></CardHeader>
            <CardContent className="grid gap-3">
              {habits.map((habit) => (
                <button
                  type="button"
                  key={habit.id}
                  className="grid min-h-12 cursor-pointer grid-cols-[1fr_auto] items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 text-left transition-colors hover:border-primary/35 hover:bg-accent/50"
                  aria-label={`${habit.isCheckedToday ? 'Uncheck' : 'Check'} habit ${habit.name}`}
                  onClick={() => habitToggle.mutate(habit)}
                >
                  <span className="flex items-center gap-2 text-sm font-medium"><HabitIconGlyph icon={habit.icon} size={16} /> {habit.name}</span>
                  <span className="text-xs font-semibold text-muted-foreground">{habit.currentStreak} day streak</span>
                  <span className="col-span-2 h-1.5 overflow-hidden rounded-full bg-muted"><span className={cn('block h-full rounded-full bg-primary transition-[width] duration-200', habit.isCheckedToday ? 'w-full' : 'w-0')} /></span>
                </button>
              ))}
              {habits.length === 0 ? <div className="grid min-h-28 place-content-center text-center"><TrendingUp className="mx-auto mb-2 size-7 text-muted-foreground" /><p className="m-0 text-sm text-muted-foreground">No habits scheduled today.</p></div> : null}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
