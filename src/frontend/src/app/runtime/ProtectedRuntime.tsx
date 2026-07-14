import { Outlet } from 'react-router-dom'
import { useTodoSync } from '@/lib/realtime/useTodoSync'
import { useHabitSync } from '@/lib/realtime/useHabitSync'
import { useKanbanSync } from '@/lib/realtime/useKanbanSync'
import { usePomodoroSync } from '@/lib/realtime/usePomodoroSync'

export function ProtectedRuntime() {
  useTodoSync()
  useHabitSync()
  useKanbanSync()
  usePomodoroSync()
  return <Outlet />
}
