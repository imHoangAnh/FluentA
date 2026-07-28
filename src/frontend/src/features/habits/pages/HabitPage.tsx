import { CalendarClock, Plus } from 'lucide-react'
import { type MouseEvent, useMemo, useRef, useState } from 'react'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import * as habitApi from '../api/habit.api'
import { restoreTrashEntry } from '@/features/trash'
import { toast } from '@/lib/toast'
import { HabitDetailsPanel } from '../components/HabitDetailsPanel'
import { HabitFormDialog } from '../components/HabitFormDialog'
import { HabitList } from '../components/HabitList'
import { HabitWeekStrip, type HabitWeekDay } from '../components/HabitWeekStrip'
import {
  browserTimeZone,
  isAggregateEligible,
  monthDates,
  parseDateInput,
  shiftMonth,
  shiftWeek,
  startOfWeek,
  toDateInput,
  toMonthInput,
  weekdays,
} from '../habit-date'

export function HabitPage() {
  const queryClient = useQueryClient()
  const timeZoneId = useMemo(() => browserTimeZone(), [])
  const today = useMemo(() => toDateInput(new Date()), [])
  const [selectedDate, setSelectedDate] = useState(today)
  const [selectedMonth, setSelectedMonth] = useState(() => toMonthInput(new Date()))
  const [selectedWeekStart, setSelectedWeekStart] = useState(() => toDateInput(startOfWeek(new Date())))
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null)
  const [formHabitId, setFormHabitId] = useState<'new' | string | null>(null)
  const formTriggerRef = useRef<HTMLButtonElement | null>(null)

  const weekDates = useMemo<HabitWeekDay[]>(() => {
    const monday = parseDateInput(selectedWeekStart)
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday)
      date.setDate(monday.getDate() + index)
      const dateStr = toDateInput(date)
      return {
        dateStr,
        dayName: weekdays[date.getDay()].slice(0, 3),
        dayNum: date.getDate(),
        isToday: dateStr === today,
      }
    })
  }, [selectedWeekStart, today])

  const habitsQuery = useQuery({
    queryKey: ['habit', 'list', timeZoneId, selectedMonth],
    queryFn: () => habitApi.listHabits(timeZoneId, selectedMonth),
  })
  const habits = useMemo(
    () => (habitsQuery.data ?? []).toSorted((left, right) => left.createdAt.localeCompare(right.createdAt) || left.name.localeCompare(right.name)),
    [habitsQuery.data],
  )
  const selectedHabit = habits.find((habit) => habit.id === selectedHabitId) ?? habits[0]
  const formHabit = formHabitId && formHabitId !== 'new'
    ? habits.find((habit) => habit.id === formHabitId)
    : undefined

  const entryQueryKeys = useMemo(() => {
    const weekMonths = [...new Set(weekDates.map((day) => day.dateStr.slice(0, 7)))]
    const keys = habits.flatMap((habit) => weekMonths.map((month) => ({ habitId: habit.id, month })))
    if (selectedHabit) keys.push({ habitId: selectedHabit.id, month: selectedMonth })
    return [...new Map(keys.map((key) => [`${key.habitId}:${key.month}`, key])).values()]
  }, [habits, selectedHabit, selectedMonth, weekDates])

  const entryQueries = useQueries({
    queries: entryQueryKeys.map(({ habitId, month }) => ({
      queryKey: ['habit', 'entries', habitId, month, timeZoneId],
      queryFn: () => habitApi.listHabitEntries(habitId, month, timeZoneId),
    })),
  })
  const entriesByHabit = useMemo(() => {
    const map = new Map(habits.map((habit) => [habit.id, new Set<string>()]))
    entryQueryKeys.forEach(({ habitId }, index) => {
      for (const entry of entryQueries[index]?.data ?? []) map.get(habitId)?.add(entry.date)
    })
    return map
  }, [entryQueries, entryQueryKeys, habits])

  const weekProgress = useMemo(() => {
    const progress = new Map<string, { completed: number; eligible: number }>()
    for (const { dateStr } of weekDates) {
      const eligibleHabits = habits.filter((habit) => isAggregateEligible(habit, dateStr))
      progress.set(dateStr, {
        eligible: eligibleHabits.length,
        completed: eligibleHabits.filter((habit) => entriesByHabit.get(habit.id)?.has(dateStr)).length,
      })
    }
    return progress
  }, [entriesByHabit, habits, weekDates])

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['habit'] })
  }
  const closeForm = () => {
    setFormHabitId(null)
    window.requestAnimationFrame(() => formTriggerRef.current?.focus())
  }
  const createHabit = useMutation({
    mutationFn: habitApi.createHabit,
    onSuccess: async (created) => {
      setSelectedHabitId(created.id)
      closeForm()
      await refresh()
    },
  })
  const updateHabit = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: habitApi.UpdateHabitInput }) => habitApi.updateHabit(id, patch),
    onSuccess: async () => {
      closeForm()
      await refresh()
    },
  })
  const deleteHabit = useMutation({
    mutationFn: habitApi.deleteHabit,
    onSuccess: async (entry) => {
      setSelectedHabitId(null)
      await refresh()
      toast.success('Habit moved to Trash. Its reminder was removed.', {
        action: {
          label: 'Undo',
          onClick: () => {
            void restoreTrashEntry(entry.id)
              .then(refresh)
              .then(() => toast.success('Habit restored without a reminder.'))
              .catch(() => toast.error('Could not restore the habit.'))
          },
        },
      })
    },
    onError: () => toast.error('Could not move the habit to Trash.'),
  })
  const toggleEntry = useMutation({
    mutationFn: ({ habitId, date }: { habitId: string; date: string }) => habitApi.toggleHabitEntry(habitId, date, timeZoneId),
    onSuccess: refresh,
  })

  const mutationError = createHabit.error ?? updateHabit.error
  const formError = mutationError instanceof Error ? mutationError.message : undefined
  const selectedDates = useMemo(() => monthDates(selectedMonth), [selectedMonth])

  function openCreate(event: MouseEvent<HTMLButtonElement>) {
    formTriggerRef.current = event.currentTarget
    setFormHabitId('new')
  }

  function openEdit(habitId: string) {
    if (document.activeElement instanceof HTMLButtonElement) formTriggerRef.current = document.activeElement
    setFormHabitId(habitId)
  }

  function selectDate(date: string) {
    setSelectedDate(date)
    setSelectedMonth(date.slice(0, 7))
  }

  return (
    <div className="habit-tracker-main">
      <section className="habit-tracker-sidebar" aria-label="Habit list">
        <header className="habit-tracker-header">
          <div className="habit-tracker-header-title"><h2>Habit Tracker</h2></div>
          <div className="habit-tracker-header-actions">
            <button type="button" ref={formTriggerRef} aria-label="Create habit" onClick={openCreate}><Plus size={24} /></button>
          </div>
        </header>
        <HabitWeekStrip
          days={weekDates}
          selectedDate={selectedDate}
          progress={weekProgress}
          onSelect={selectDate}
          onPrevious={() => setSelectedWeekStart((week) => shiftWeek(week, -1))}
          onNext={() => setSelectedWeekStart((week) => shiftWeek(week, 1))}
        />
        <HabitList
          habits={habits}
          entriesByHabit={entriesByHabit}
          selectedHabitId={selectedHabit?.id}
          selectedDate={selectedDate}
          today={today}
          isLoading={habitsQuery.isLoading}
          isToggling={toggleEntry.isPending}
          onSelect={setSelectedHabitId}
          onToggle={(habitId, date) => toggleEntry.mutate({ habitId, date })}
        />
      </section>

      <section className="habit-tracker-details" aria-label="Selected habit details">
        {selectedHabit ? (
          <HabitDetailsPanel
            habit={selectedHabit}
            completedDates={entriesByHabit.get(selectedHabit.id) ?? new Set<string>()}
            dates={selectedDates}
            selectedMonth={selectedMonth}
            today={today}
            isToggling={toggleEntry.isPending}
            onPreviousMonth={() => setSelectedMonth((month) => shiftMonth(month, -1))}
            onNextMonth={() => setSelectedMonth((month) => shiftMonth(month, 1))}
            onToggle={(date) => toggleEntry.mutate({ habitId: selectedHabit.id, date })}
            onEdit={() => openEdit(selectedHabit.id)}
            onDelete={() => deleteHabit.mutate(selectedHabit.id)}
          />
        ) : (
          <div className="habit-tracker-empty-state"><CalendarClock size={80} /><p>Select a habit to view your progress</p></div>
        )}
      </section>

      {formHabitId ? (
        <HabitFormDialog
          key={formHabitId}
          habit={formHabit}
          today={today}
          timeZoneId={timeZoneId}
          isSaving={createHabit.isPending || updateHabit.isPending}
          error={formError}
          onClose={closeForm}
          onSubmit={(payload) => formHabit
            ? updateHabit.mutate({ id: formHabit.id, patch: payload })
            : createHabit.mutate(payload)}
        />
      ) : null}
    </div>
  )
}
