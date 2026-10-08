import { Outlet } from 'react-router-dom'
import { usePomodoroSync } from '@/features/pomodoro'

export function ProtectedRuntime() {
  usePomodoroSync()
  return <Outlet />
}
