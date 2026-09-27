import { connectAuthenticatedSync } from '@/shared/api/realtime'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useAuthStore } from '@/features/auth'
import { projectKeys } from '../api/project.queries'

export function useProjectSync() {
  const isAuthenticated = useAuthStore((state) => state.status === 'authenticated')
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!isAuthenticated || import.meta.env.MODE === 'test' || typeof window.WebSocket === 'undefined') return

    return connectAuthenticatedSync((connection) => {
      connection.on('ProjectCardMoved', () => {
        void queryClient.invalidateQueries({ queryKey: projectKeys.all, refetchType: 'all' })
      })
    })
  }, [isAuthenticated, queryClient])
}
