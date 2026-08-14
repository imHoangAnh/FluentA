import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { rectSortingStrategy, SortableContext, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { CalendarClock, FolderKanban, ListChecks, Repeat2, RotateCcw, Timer } from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth'
import * as countdownApi from '@/features/countdown'
import { countdownKeys } from '@/features/countdown'
import * as habitApi from '@/features/habits'
import { habitKeys } from '@/features/habits'
import * as pomodoroApi from '@/features/pomodoro'
import { pomodoroKeys } from '@/features/pomodoro'
import * as projectApi from '@/features/project'
import { projectKeys } from '@/features/project'
import { getReviewDashboard } from '@/features/review'
import { reviewKeys } from '@/features/review'
import * as todoApi from '@/features/todo'
import { todoKeys } from '@/features/todo'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { cn } from '@/shared/lib/utils'
import { DashboardWidgetMenu } from '../components/DashboardWidgetMenu'
import { CountdownAction, CountdownWidget, HabitWidget, PomodoroAction, PomodoroWidget, ProjectAction, ProjectWidget, ReviewQueueAction, ReviewQueueWidget, TodoAction, TodoWidget } from '../components/DashboardWidgetCards'
import { SortableDashboardWidget } from '../components/SortableDashboardWidget'
import { dashboardWidgetLabel, dashboardWidgetRows, dashboardWidgetSlotClass, type DashboardWidgetId } from '../model/dashboard-widgets'
import { normalizeDashboardWidgetOrder, persistDashboardWidgetOrder, readDashboardWidgetOrder, reorderDashboardWidgets, toggleDashboardWidget } from '../model/dashboard-widget-preferences'

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
  return `Good night 🌙, ${name}`
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

function WidgetError({ label }: { label: string }) {
  return <p className="m-0 p-4 text-sm text-destructive" role="alert">Could not load {label}.</p>
}

const widgetMeta: Record<DashboardWidgetId, { description: string; icon: ReactNode }> = {
  review: { description: 'Scheduled reviews stay separate from new words.', icon: <RotateCcw className="size-4" /> },
  todo: { description: 'Your three most relevant tasks.', icon: <ListChecks className="size-4" /> },
  countdown: { description: 'Keep the nearest milestone in view.', icon: <CalendarClock className="size-4" /> },
  habits: { description: 'Small actions that keep your learning rhythm alive.', icon: <Repeat2 className="size-4" /> },
  project: { description: 'Your boards and active project cards at a glance.', icon: <FolderKanban className="size-4" /> },
  pomodoro: { description: 'Current focus state and today\'s completed sessions.', icon: <Timer className="size-4" /> },
}

export function DashboardPage() {
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const [now, setNow] = useState(() => new Date())
  const [visibleWidgets, setVisibleWidgets] = useState<DashboardWidgetId[]>(() => readDashboardWidgetOrder())
  const [activeWidget, setActiveWidget] = useState<DashboardWidgetId | null>(null)

  const today = useMemo(() => toDateInput(new Date()), [])
  const timeZoneId = useMemo(() => browserTimeZone(), [])
  const displayName = user?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'Learner'
  const visible = (id: DashboardWidgetId) => visibleWidgets.includes(id)

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(intervalId)
  }, [])

  const todosQuery = useQuery({ queryKey: todoKeys.day(today), queryFn: () => todoApi.listByDate(today), enabled: visible('todo') })
  const habitsQuery = useQuery({ queryKey: habitKeys.list(timeZoneId), queryFn: () => habitApi.listHabits(timeZoneId), enabled: visible('habits') })
  const countdownsQuery = useQuery({ queryKey: countdownKeys.events, queryFn: countdownApi.listCountdowns, enabled: visible('countdown') })
  const flashcardDashboardQuery = useQuery({ queryKey: reviewKeys.dashboard, queryFn: () => getReviewDashboard(timeZoneId), enabled: visible('review') })
  const projectBoardsQuery = useQuery({ queryKey: projectKeys.boards, queryFn: projectApi.listBoards, enabled: visible('project') })
  const pomodoroCurrentQuery = useQuery({ queryKey: pomodoroKeys.current, queryFn: pomodoroApi.getPomodoroCurrent, enabled: visible('pomodoro') })
  const pomodoroTodayQuery = useQuery({ queryKey: pomodoroKeys.today, queryFn: pomodoroApi.getPomodoroToday, enabled: visible('pomodoro') })

  const todoToggle = useMutation({
    mutationFn: (todo: todoApi.TodoItem) => todoApi.updateTodo(todo.id, { isCompleted: !todo.isCompleted }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: todoKeys.all }) },
  })

  const habitToggle = useMutation({
    mutationFn: (habit: habitApi.Habit) => habitApi.toggleHabitEntry(habit.id, today, timeZoneId),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: habitKeys.all }) },
  })

  const todos = useMemo(
    () => (todosQuery.data ?? []).toSorted((left, right) => Number(left.isCompleted) - Number(right.isCompleted) || (left.completedAt ?? left.createdAt).localeCompare(right.completedAt ?? right.createdAt)),
    [todosQuery.data],
  )
  const habits = useMemo(() => (habitsQuery.data ?? []).filter((habit) => habit.isScheduledToday).slice(0, 3), [habitsQuery.data])
  const countdowns = useMemo(() => (countdownsQuery.data ?? [])
    .filter((countdown) => !countdown.isCompleted)
    .toSorted((left, right) => new Date(left.targetDate).getTime() - new Date(right.targetDate).getTime())
    .slice(0, 1), [countdownsQuery.data])
  const flashcardDashboard = flashcardDashboardQuery.data
  const dueReview = (flashcardDashboard?.overdue ?? 0) + (flashcardDashboard?.dueToday ?? 0)
  const learningCards = flashcardDashboard?.newCards ?? 0
  const isLoading = (visible('todo') && todosQuery.isLoading)
    || (visible('habits') && habitsQuery.isLoading)
    || (visible('countdown') && countdownsQuery.isLoading)
    || (visible('review') && flashcardDashboardQuery.isLoading)
    || (visible('project') && projectBoardsQuery.isLoading)
    || (visible('pomodoro') && (pomodoroCurrentQuery.isLoading || pomodoroTodayQuery.isLoading))

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
    if (id === 'review') return flashcardDashboardQuery.isError ? <WidgetError label="Review queue" /> : <ReviewQueueWidget dueReview={dueReview} learningCards={learningCards} />
    if (id === 'todo') return todosQuery.isError ? <WidgetError label="Todo" /> : <TodoWidget todos={todos} onToggle={(todo) => todoToggle.mutate(todo)} />
    if (id === 'countdown') return countdownsQuery.isError ? <WidgetError label="Countdowns" /> : <CountdownWidget countdown={countdowns[0]} remainingText={(targetDate) => remainingText(targetDate, now)} />
    if (id === 'habits') return habitsQuery.isError ? <WidgetError label="Habit tracker" /> : <HabitWidget habits={habits} onToggle={(habit) => habitToggle.mutate(habit)} />
    if (id === 'project') return projectBoardsQuery.isError ? <WidgetError label="Project" /> : <ProjectWidget boards={projectBoardsQuery.data ?? []} />
    return pomodoroCurrentQuery.isError || pomodoroTodayQuery.isError
      ? <WidgetError label="Pomodoro" />
      : <PomodoroWidget current={pomodoroCurrentQuery.data} today={pomodoroTodayQuery.data} />
  }

  function renderWidgetFooter(id: DashboardWidgetId) {
    if (id === 'review') return <ReviewQueueAction />
    if (id === 'todo') return <TodoAction />
    if (id === 'countdown') return <CountdownAction />
    if (id === 'project') return <ProjectAction />
    if (id === 'pomodoro') return <PomodoroAction />
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
          <h2 id="welcome-heading" className="m-0 truncate text-2xl font-semibold tracking-[-0.035em] text-foreground sm:text-3xl">{greeting(now.getHours(), displayName)}</h2>
          <p className="m-0 mt-1.5 text-sm text-muted-foreground">{new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(now)}</p>
        </div>
        <DashboardWidgetMenu visibleWidgets={visibleWidgets} onToggle={handleWidgetToggle} />
      </section>

      {isLoading ? (
        <div className={cn('grid min-h-0 flex-1 grid-cols-12 gap-3', dashboardWidgetRows(visibleWidgets.length))} aria-label="Loading dashboard" aria-busy="true">
          {visibleWidgets.map((id, index) => <Skeleton key={id} className={cn('h-full min-h-0', dashboardWidgetSlotClass(index))} />)}
        </div>
      ) : (
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
      )}
    </div>
  )
}
