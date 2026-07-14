import { CalendarClock, Check, CheckCircle2, Circle, Timer, TrendingUp } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { AppShell } from '@/shared/components/layout/AppShell'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Skeleton } from '@/shared/components/ui/skeleton'
import * as countdownApi from '@/lib/api/countdown.api'
import * as flashcardApi from '@/lib/api/flashcard.api'
import * as habitApi from '@/lib/api/habit.api'
import * as todoApi from '@/lib/api/todo.api'
import { HabitIconGlyph } from '@/lib/habit-icons'
import { useAuthStore } from '@/features/auth'
import { cn } from '@/shared/lib/utils'

const preloadJournalEditor = () => import('../journal/JournalRichTextEditor')

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
  if (hour >= 5 && hour < 12) return `Good morning, ${name}`
  if (hour >= 12 && hour < 17) return `Good afternoon, ${name}`
  if (hour >= 17 && hour < 21) return `Good evening, ${name}`
  return `Burning midnight oil, ${name}?`
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
  const flashcardDashboardQuery = useQuery({ queryKey: ['review', 'dashboard'], queryFn: () => flashcardApi.getDashboard(timeZoneId) })

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
  const dueCards = (flashcardDashboard?.overdue ?? 0) + (flashcardDashboard?.dueToday ?? 0) + (flashcardDashboard?.newCards ?? 0)
  const dueReview = (flashcardDashboard?.overdue ?? 0) + (flashcardDashboard?.dueToday ?? 0)
  const ringProgress = Math.min(100, dueCards * 5)
  const isLoading = todosQuery.isLoading || habitsQuery.isLoading || countdownsQuery.isLoading || flashcardDashboardQuery.isLoading

  return (
    <AppShell
      title="Overview"
    >
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
        <div className="grid grid-cols-12 gap-4">
          <Card className="col-span-8 max-xl:col-span-12">
            <CardHeader className="flex-row items-start justify-between">
              <div><CardTitle>Review queue</CardTitle><CardDescription>Cards ready for your next focused session.</CardDescription></div>
              <Badge variant={dueCards > 0 ? 'default' : 'outline'}>{dueCards} due</Badge>
            </CardHeader>
            <CardContent className="grid grid-cols-[180px_1fr] items-center gap-8 max-md:grid-cols-1">
              <div className="relative mx-auto size-40" aria-label={`${dueCards} cards due today`}>
                <svg className="size-full -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="var(--ds-muted)" strokeWidth="9" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke="var(--ds-primary)" strokeWidth="9" strokeLinecap="round" pathLength="100" strokeDasharray="100" strokeDashoffset={100 - ringProgress} />
                </svg>
                <div className="absolute inset-0 grid place-content-center text-center"><strong className="text-3xl">{dueCards}</strong><span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Due today</span></div>
              </div>
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border bg-background p-4"><p className="m-0 text-xs text-muted-foreground">Review</p><p className="m-0 mt-1 text-2xl font-semibold">{dueReview}</p></div>
                  <div className="rounded-lg border border-border bg-background p-4"><p className="m-0 text-xs text-muted-foreground">Learning</p><p className="m-0 mt-1 text-2xl font-semibold">{flashcardDashboard?.newCards ?? 0}</p></div>
                </div>
                {dueCards === 0 ? <p className="m-0 text-sm text-muted-foreground">No cards due today</p> : null}
                <Button asChild><Link to="/review">Open Review</Link></Button>
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-4 max-xl:col-span-12">
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
    </AppShell>
  )
}
