import { connectAuthenticatedSync } from '@/shared/api/realtime'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useAuthStore } from '@/features/auth'
import { pomodoroKeys } from '../api/pomodoro.queries'

export function usePomodoroSync() {
  const isAuthenticated = useAuthStore((state) => state.status === 'authenticated')
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!isAuthenticated || import.meta.env.MODE === 'test' || typeof window.WebSocket === 'undefined') return

    return connectAuthenticatedSync((connection) => {
      connection.on('PomodoroSync', () => {
        void queryClient.invalidateQueries({ queryKey: pomodoroKeys.current, refetchType: 'all' })
      })
    })
  }, [isAuthenticated, queryClient])
}
