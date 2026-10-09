import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { rectSortingStrategy, SortableContext, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { CalendarClock, FolderKanban, ListChecks, Repeat2, RotateCcw } from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth'
import * as countdownApi from '@/features/countdown'
import { countdownKeys } from '@/features/countdown'
import * as habitApi from '@/features/habits'
import { habitKeys } from '@/features/habits'
import * as projectApi from '@/features/project'
import { projectKeys } from '@/features/project'
import { getReviewDashboard } from '@/features/review'
import { reviewKeys } from '@/features/review'
import * as todoApi from '@/features/todo'
import { todoKeys } from '@/features/todo'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { APP_TIME_ZONE, appHour, differenceInCalendarDays, formatVietnamDateOnly, todayInAppTimeZone } from '@/shared/lib/timezone'
import { cn } from '@/shared/lib/utils'
import { DashboardWidgetMenu } from '../components/DashboardWidgetMenu'
import { CountdownAction, CountdownWidget, HabitWidget, ProjectAction, ProjectWidget, ReviewQueueAction, ReviewQueueWidget, TodoAction, TodoWidget } from '../components/DashboardWidgetCards'
import { SortableDashboardWidget } from '../components/SortableDashboardWidget'
import { dashboardWidgetLabel, dashboardWidgetRows, type DashboardWidgetId } from '../model/dashboard-widgets'
import { normalizeDashboardWidgetOrder, persistDashboardWidgetOrder, readDashboardWidgetOrder, reorderDashboardWidgets, toggleDashboardWidget } from '../model/dashboard-widget-preferences'

function greeting(hour: number, name: string) {
  if (hour >= 5 && hour < 12) return `Good morning 🌅, ${name}`
  if (hour >= 12 && hour < 17) return `Good afternoon ☀️, ${name}`
  if (hour >= 17 && hour < 21) return `Good evening 🌇, ${name}`
  return `Good night 🌙, ${name}`
}

function remainingText(targetDate: string, now: Date) {
  const days = differenceInCalendarDays(targetDate, todayInAppTimeZone(now))
  if (!Number.isFinite(days)) return 'Unknown'
  if (days < 0) return 'Completed'
  if (days === 0) return 'Today'
  return `${days} ${days === 1 ? 'day' : 'days'} left`
}

function WidgetError({ label, onRetry }: { label: string; onRetry: () => void }) {
  return (
    <div className="grid gap-2 p-4" role="alert">
      <p className="m-0 text-sm text-destructive">Could not load {label}.</p>
      <button type="button" className="w-fit text-sm text-primary underline" onClick={onRetry}>Retry loading {label}</button>
    </div>
  )
}

function ToggleError({ label, onRetry }: { label: string; onRetry: () => void }) {
  return (
    <div className="grid gap-2 px-4 pb-4" role="alert">
      <p className="m-0 text-sm text-destructive">Could not update {label}. Your previous state is unchanged.</p>
      <button type="button" className="w-fit text-sm text-primary underline" onClick={onRetry}>Retry {label} update</button>
    </div>
  )
}

const widgetMeta: Record<DashboardWidgetId, { description: string; icon: ReactNode }> = {
  review: { description: 'Scheduled reviews stay separate from new words.', icon: <RotateCcw className="size-4" /> },
  todo: { description: 'Your three most relevant tasks.', icon: <ListChecks className="size-4" /> },
  countdown: { description: 'Keep the nearest milestone in view.', icon: <CalendarClock className="size-4" /> },
  habits: { description: 'Small actions that keep your learning rhythm alive.', icon: <Repeat2 className="size-4" /> },
  project: { description: 'Your boards and active project cards at a glance.', icon: <FolderKanban className="size-4" /> },
}

export function DashboardPage() {
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const [now, setNow] = useState(() => new Date())
  const [visibleWidgets, setVisibleWidgets] = useState<DashboardWidgetId[]>(() => readDashboardWidgetOrder())
  const [activeWidget, setActiveWidget] = useState<DashboardWidgetId | null>(null)
  const previousTodayRef = useRef<string | null>(null)

  const today = useMemo(() => todayInAppTimeZone(now), [now])
  const timeZoneId = APP_TIME_ZONE
  const displayName = user?.fullName?.split(' ')[0] || 'Learner'
  const visible = (id: DashboardWidgetId) => visibleWidgets.includes(id)

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
    ])
  }, [queryClient, today])

  const todosQuery = useQuery({ queryKey: todoKeys.day(today), queryFn: () => todoApi.listByDate(today), enabled: visible('todo') })
  const habitsQuery = useQuery({ queryKey: habitKeys.list(timeZoneId), queryFn: () => habitApi.listHabits(timeZoneId), enabled: visible('habits') })
  const countdownsQuery = useQuery({ queryKey: countdownKeys.events, queryFn: countdownApi.listCountdowns, enabled: visible('countdown') })
  const reviewDashboardQuery = useQuery({ queryKey: reviewKeys.dashboard, queryFn: () => getReviewDashboard(timeZoneId), enabled: visible('review') })
  const projectBoardsQuery = useQuery({ queryKey: projectKeys.boards, queryFn: projectApi.listBoards, enabled: visible('project') })

  const todoToggle = useMutation({
    mutationFn: (todo: todoApi.TodoItem) => todoApi.updateTodo(todo.id, { isCompleted: !todo.isCompleted }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: todoKeys.all }) },
  })

  const habitToggle = useMutation({
    mutationFn: ({ habit, date }: { habit: habitApi.Habit; date: string }) => habitApi.toggleHabitEntry(habit.id, date, timeZoneId),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: habitKeys.all }) },
  })

  const todos = useMemo(
    () => (todosQuery.data ?? []).toSorted((left, right) => Number(left.isCompleted) - Number(right.isCompleted) || (left.completedAt ?? left.createdAt).localeCompare(right.completedAt ?? right.createdAt)),
    [todosQuery.data],
  )
  const habits = useMemo(() => (habitsQuery.data ?? []).filter((habit) => habit.isScheduledToday).slice(0, 3), [habitsQuery.data])
  const countdowns = useMemo(() => (countdownsQuery.data ?? [])
    .filter((countdown) => !countdown.isCompleted && countdown.targetDate >= today)
    .toSorted((left, right) => left.targetDate.localeCompare(right.targetDate))
    .slice(0, 1), [countdownsQuery.data, today])
  const dueReview = reviewDashboardQuery.data?.dueCount ?? 0
  const widgetQueries = { review: reviewDashboardQuery, todo: todosQuery, countdown: countdownsQuery, habits: habitsQuery, project: projectBoardsQuery }

  function saveWidgetOrder(nextOrder: readonly DashboardWidgetId[]) {
    const normalized = normalizeDashboardWidgetOrder(nextOrder)
    setVisibleWidgets(normalized)
    persistDashboardWidgetOrder(normalized)
  }

  function handleWidgetToggle(id: DashboardWidgetId) {
    saveWidgetOrder(toggleDashboardWidget(visibleWidgets, id))
  }

  function handleDragStart({ active }: { active: { id: string | number } }) {
    setActiveWidget(active.id as DashboardWidgetId)
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveWidget(null)
    if (!over) return
    saveWidgetOrder(reorderDashboardWidgets(visibleWidgets, String(active.id), String(over.id)))
  }

  function renderWidget(id: DashboardWidgetId) {
    const query = widgetQueries[id]
    const label = dashboardWidgetLabel(id)
    if (query.isPending) return (
      <div className="grid gap-3 p-4" role="status" aria-label={`Loading ${label}`} aria-busy="true">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-8 w-3/4" />
      </div>
    )
    if (query.isError) return <WidgetError label={label} onRetry={() => { void query.refetch() }} />
    if (id === 'review') return <ReviewQueueWidget dueReview={dueReview} />
    if (id === 'todo') return (
      <>
        <TodoWidget todos={todos} isPending={todoToggle.isPending} onToggle={(todo) => todoToggle.mutate(todo)} />
        {todoToggle.isError && todoToggle.variables?.date === today ? (
          <ToggleError label="Todo" onRetry={() => { if (todoToggle.variables) todoToggle.mutate(todoToggle.variables) }} />
        ) : null}
      </>
    )
    if (id === 'countdown') return <CountdownWidget countdown={countdowns[0]} remainingText={(targetDate) => remainingText(targetDate, now)} />
    if (id === 'habits') return (
      <>
        <HabitWidget habits={habits} isPending={habitToggle.isPending} onToggle={(habit) => habitToggle.mutate({ habit, date: today })} />
        {habitToggle.isError && habitToggle.variables?.date === today ? (
          <ToggleError label="Habit" onRetry={() => { if (habitToggle.variables) habitToggle.mutate(habitToggle.variables) }} />
        ) : null}
      </>
    )
    if (id === 'project') return <ProjectWidget boards={projectBoardsQuery.data ?? []} />
  }

  function renderWidgetFooter(id: DashboardWidgetId) {
    if (id === 'review') return <ReviewQueueAction />
    if (id === 'todo') return <TodoAction />
    if (id === 'countdown') return <CountdownAction />
    if (id === 'project') return <ProjectAction />
    return undefined
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  return (
    <div className="flex h-full min-h-0 flex-col gap-3" data-testid="dashboard-overview">
      <section className="flex shrink-0 flex-wrap items-end justify-between gap-3" aria-labelledby="welcome-heading">
        <div className="min-w-0">
          <h2 id="welcome-heading" className="m-0 truncate text-2xl font-semibold tracking-[-0.035em] text-foreground sm:text-3xl">{greeting(appHour(now), displayName)}</h2>
          <p className="m-0 mt-1.5 text-sm text-muted-foreground">{formatVietnamDateOnly(today, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>
        <DashboardWidgetMenu visibleWidgets={visibleWidgets} onToggle={handleWidgetToggle} />
      </section>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragCancel={() => setActiveWidget(null)} onDragEnd={handleDragEnd}>
          <SortableContext items={visibleWidgets} strategy={rectSortingStrategy}>
            <div className={cn('grid min-h-0 flex-1 grid-cols-12 gap-3', dashboardWidgetRows(visibleWidgets.length))} data-testid="dashboard-widget-grid">
              {visibleWidgets.map((id, index) => (
                <SortableDashboardWidget
                  key={id}
                  id={id}
                  index={index}
                  title={dashboardWidgetLabel(id)}
                  description={widgetMeta[id].description}
                  icon={widgetMeta[id].icon}
                  removeDisabled={visibleWidgets.length <= 3}
                  onRemove={() => handleWidgetToggle(id)}
                  footer={renderWidgetFooter(id)}
                >
                  {renderWidget(id)}
                </SortableDashboardWidget>
              ))}
            </div>
          </SortableContext>
          <div className="sr-only" aria-live="polite">{activeWidget ? `Moving ${dashboardWidgetLabel(activeWidget)} widget` : ''}</div>
      </DndContext>
    </div>
  )
}
