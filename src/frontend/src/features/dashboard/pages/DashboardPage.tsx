import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { analyticsKeys, getLearningAnalytics } from '@/features/analytics'
import { useAuthStore } from '@/features/auth'
import * as countdownApi from '@/features/countdown'
import { countdownKeys } from '@/features/countdown'
import * as habitApi from '@/features/habits'
import { habitKeys } from '@/features/habits'
import { computeJournalStreak, journalKeys, listJournalEntries } from '@/features/journal'
import { listNoteBoards, noteKeys } from '@/features/notes'
import * as projectApi from '@/features/project'
import { projectKeys } from '@/features/project'
import { getReviewDashboard, reviewKeys } from '@/features/review'
import * as todoApi from '@/features/todo'
import { todoKeys } from '@/features/todo'
import { differenceInCalendarDays, formatDateOnly, todayUtc, utcHour } from '@/shared/lib/date'
import {
  CountdownCard,
  HabitTrackerCard,
  JournalCard,
  LearningPulseCard,
  ProjectsCard,
  ReviewQueueCard,
  TodoCard,
} from '../components/DashboardWidgetCards'

function greetingText(hour: number, name: string) {
  if (hour >= 5 && hour < 12) return `Good morning, ${name}`
  if (hour >= 12 && hour < 17) return `Good afternoon, ${name}`
  if (hour >= 17 && hour < 21) return `Good evening, ${name}`
  return `Good night, ${name}`
}

function remainingText(targetDate: string, now: Date) {
  const days = differenceInCalendarDays(targetDate, todayUtc(now))
  if (!Number.isFinite(days)) return 'Unknown'
  if (days < 0) return 'Completed'
  if (days === 0) return 'Today'
  return `${days} ${days === 1 ? 'day' : 'days'} left`
}

export function DashboardPage() {
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const [now, setNow] = useState(() => new Date())
  const previousTodayRef = useRef<string | null>(null)

  const today = useMemo(() => todayUtc(now), [now])
  const displayName = user?.fullName?.split(' ')[0] || 'Learner'

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    if (previousTodayRef.current === null) {
      previousTodayRef.current = today
      return
    }
    if (previousTodayRef.current === today) return

    previousTodayRef.current = today
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: todoKeys.all, refetchType: 'all' }),
      queryClient.invalidateQueries({ queryKey: habitKeys.all, refetchType: 'all' }),
      queryClient.invalidateQueries({ queryKey: countdownKeys.events, refetchType: 'all' }),
      queryClient.invalidateQueries({ queryKey: reviewKeys.dashboard, refetchType: 'all' }),
      queryClient.invalidateQueries({ queryKey: journalKeys.entries, refetchType: 'all' }),
      queryClient.invalidateQueries({ queryKey: analyticsKeys.all, refetchType: 'all' }),
    ])
  }, [queryClient, today])

  const todosQuery = useQuery({ queryKey: todoKeys.day(today), queryFn: () => todoApi.listByDate(today) })
  const habitsQuery = useQuery({ queryKey: habitKeys.list(), queryFn: () => habitApi.listHabits() })
  const countdownsQuery = useQuery({ queryKey: countdownKeys.events, queryFn: () => countdownApi.listCountdowns() })
  const reviewDashboardQuery = useQuery({ queryKey: reviewKeys.dashboard, queryFn: () => getReviewDashboard() })
  const projectBoardsQuery = useQuery({ queryKey: projectKeys.boards, queryFn: () => projectApi.listBoards() })
  const journalEntriesQuery = useQuery({ queryKey: journalKeys.entries, queryFn: () => listJournalEntries() })
  const noteBoardsQuery = useQuery({ queryKey: noteKeys.boards, queryFn: () => listNoteBoards() })
  const analyticsQuery = useQuery({ queryKey: analyticsKeys.overview('30d'), queryFn: () => getLearningAnalytics('30d') })

  const todoToggle = useMutation({
    mutationFn: (todo: todoApi.TodoItem) => todoApi.updateTodo(todo.id, { isCompleted: !todo.isCompleted }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: todoKeys.all }) },
  })

  const habitToggle = useMutation({
    mutationFn: ({ habit, date }: { habit: habitApi.Habit; date: string }) => habitApi.toggleHabitEntry(habit.id, date),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: habitKeys.all }) },
  })

  const todos = useMemo(
    () => (todosQuery.data ?? []).toSorted(
      (left, right) => Number(left.isCompleted) - Number(right.isCompleted)
        || (left.completedAt ?? left.createdAt).localeCompare(right.completedAt ?? right.createdAt),
    ),
    [todosQuery.data],
  )

  const scheduledHabits = useMemo(
    () => (habitsQuery.data ?? []).filter((habit) => habit.isScheduledToday),
    [habitsQuery.data],
  )

  const nearestCountdown = useMemo(
    () => (countdownsQuery.data ?? [])
      .filter((countdown) => !countdown.isCompleted && countdown.targetDate >= today)
      .toSorted((left, right) => left.targetDate.localeCompare(right.targetDate))[0],
    [countdownsQuery.data, today],
  )

  const journalStreak = useMemo(
    () => computeJournalStreak(journalEntriesQuery.data ?? [], now),
    [journalEntriesQuery.data, now],
  )

  const recentNotes = useMemo(
    () => (noteBoardsQuery.data ?? [])
      .flatMap((board) => board.pages)
      .toSorted((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    [noteBoardsQuery.data],
  )

  const dueReview = reviewDashboardQuery.data?.dueCount ?? 0
  const previewWords = reviewDashboardQuery.data?.previewWords ?? []
  const retentionPercent = analyticsQuery.data?.retention.ratePercent ?? null

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-5" data-testid="dashboard-overview">
      <section className="flex flex-col gap-0.5" aria-labelledby="welcome-heading">
        <h2 id="welcome-heading" className="m-0 text-[24px] font-bold leading-[32px] text-foreground">
          {greetingText(utcHour(now), displayName)}
        </h2>
        <p className="m-0 text-[13px] text-muted-foreground">
          {formatDateOnly(today, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,484fr)_minmax(0,440fr)_minmax(0,316fr)]">
        <ReviewQueueCard
          className="lg:min-h-[296px]"
          dueReview={dueReview}
          previewWords={previewWords}
          retentionPercent={retentionPercent}
          isPending={reviewDashboardQuery.isPending}
          isError={reviewDashboardQuery.isError}
          onRetry={() => { void reviewDashboardQuery.refetch() }}
        />

        <TodoCard
          className="lg:min-h-[296px]"
          todos={todos}
          isPending={todosQuery.isPending}
          isError={todosQuery.isError}
          onRetry={() => { void todosQuery.refetch() }}
          isMutating={todoToggle.isPending}
          toggleError={Boolean(todoToggle.isError && todoToggle.variables?.date === today)}
          onToggle={(todo) => todoToggle.mutate(todo)}
          onRetryToggle={() => { if (todoToggle.variables) todoToggle.mutate(todoToggle.variables) }}
        />

        <CountdownCard
          className="lg:min-h-[296px]"
          countdown={nearestCountdown}
          remainingText={(targetDate) => remainingText(targetDate, now)}
          isPending={countdownsQuery.isPending}
          isError={countdownsQuery.isError}
          onRetry={() => { void countdownsQuery.refetch() }}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <HabitTrackerCard
          className="lg:min-h-[316px]"
          habits={scheduledHabits}
          isPending={habitsQuery.isPending}
          isError={habitsQuery.isError}
          onRetry={() => { void habitsQuery.refetch() }}
          isMutating={habitToggle.isPending}
          toggleError={Boolean(habitToggle.isError && habitToggle.variables?.date === today)}
          onToggle={(habit) => habitToggle.mutate({ habit, date: today })}
          onRetryToggle={() => { if (habitToggle.variables) habitToggle.mutate(habitToggle.variables) }}
        />

        <ProjectsCard
          className="lg:min-h-[316px]"
          boards={projectBoardsQuery.data ?? []}
          isPending={projectBoardsQuery.isPending}
          isError={projectBoardsQuery.isError}
          onRetry={() => { void projectBoardsQuery.refetch() }}
        />

        <JournalCard
          className="lg:min-h-[316px]"
          streakDays={journalStreak}
          notes={recentNotes}
          now={now}
          isPending={journalEntriesQuery.isPending || noteBoardsQuery.isPending}
          isError={journalEntriesQuery.isError && noteBoardsQuery.isError}
          onRetry={() => {
            void journalEntriesQuery.refetch()
            void noteBoardsQuery.refetch()
          }}
        />
      </div>

      <LearningPulseCard
        analytics={analyticsQuery.data}
        isPending={analyticsQuery.isPending}
        isError={analyticsQuery.isError}
        onRetry={() => { void analyticsQuery.refetch() }}
      />
    </div>
  )
}
