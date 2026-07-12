import type { HabitIcon } from './api/habit.api'

export const habitIconOptions: ReadonlyArray<{ value: HabitIcon; label: string }> = [
  { value: 'Default', label: 'Default' },
  { value: 'Book', label: 'Book' },
  { value: 'Exercise', label: 'Exercise' },
  { value: 'Water', label: 'Water' },
  { value: 'Meditation', label: 'Meditation' },
  { value: 'Study', label: 'Study' },
  { value: 'Work', label: 'Work' },
  { value: 'Health', label: 'Health' },
]
