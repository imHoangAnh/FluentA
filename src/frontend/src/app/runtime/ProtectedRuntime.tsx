import { Outlet } from 'react-router-dom'
import { useHabitSync } from '@/features/habits'
import { useProjectSync } from '@/features/project'
import { usePomodoroSync } from '@/features/pomodoro'

export function ProtectedRuntime() {
  useHabitSync()
  useProjectSync()
  usePomodoroSync()
  return <Outlet />
}
