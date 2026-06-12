import { type ReactNode, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useTodoSync } from '../realtime/useTodoSync'
import { useHabitSync } from '../realtime/useHabitSync'
import { useKanbanSync } from '../realtime/useKanbanSync'
import { usePomodoroSync } from '../realtime/usePomodoroSync'
import { useAuthStore } from '../../stores/authStore'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const status = useAuthStore((state) => state.status)
  const user = useAuthStore((state) => state.user)
  const loadMe = useAuthStore((state) => state.loadMe)

  useTodoSync()
  useHabitSync()
  useKanbanSync()
  usePomodoroSync()

  useEffect(() => {
    if (status === 'idle') {
      void loadMe()
    }
  }, [loadMe, status])

  if (status === 'idle' || status === 'checking') {
    return <div className="screen-status">Checking your FluentA session...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}
