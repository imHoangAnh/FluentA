import { Outlet } from 'react-router-dom'
import { useTodoSync } from '@/features/todo'
import { useHabitSync } from '@/features/habits'
import { useProjectSync } from '@/features/project'
import { usePomodoroSync } from '@/features/pomodoro'

export function ProtectedRuntime() {
  useTodoSync()
  useHabitSync()
  useProjectSync()
  usePomodoroSync()
  return <Outlet />
}
