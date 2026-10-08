import { Outlet } from 'react-router-dom'
import { useProjectSync } from '@/features/project'
import { usePomodoroSync } from '@/features/pomodoro'

export function ProtectedRuntime() {
  useProjectSync()
  usePomodoroSync()
  return <Outlet />
}
