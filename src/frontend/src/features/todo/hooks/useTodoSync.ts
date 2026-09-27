import { connectAuthenticatedSync } from '@/shared/api/realtime'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useAuthStore } from '@/features/auth'
import { dashboardKeys } from '@/shared/api/dashboard.queries'
import { todoKeys } from '../api/todo.queries'

export function useTodoSync() {
  const isAuthenticated = useAuthStore((state) => state.status === 'authenticated')
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!isAuthenticated || import.meta.env.MODE === 'test' || typeof window.WebSocket === 'undefined') return

    return connectAuthenticatedSync((connection) => {
      connection.on('TodoItemChecked', () => {
        void queryClient.invalidateQueries({ queryKey: todoKeys.all, refetchType: 'all' })
        void queryClient.invalidateQueries({ queryKey: dashboardKeys.all, refetchType: 'all' })
      })
    })
  }, [isAuthenticated, queryClient])
}
