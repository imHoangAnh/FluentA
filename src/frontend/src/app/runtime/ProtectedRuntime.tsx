import { Outlet } from 'react-router-dom'
import { useTodoSync } from '@/features/todo'
import { useHabitSync } from '@/lib/realtime/useHabitSync'
import { useKanbanSync } from '@/features/kanban'
import { usePomodoroSync } from '@/lib/realtime/usePomodoroSync'

export function ProtectedRuntime() {
  useTodoSync()
  useHabitSync()
  useKanbanSync()
  usePomodoroSync()
  return <Outlet />
}
