import { connectAuthenticatedSync } from '@/shared/api/realtime'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useAuthStore } from '@/features/auth'
import { notificationKeys } from '../api/notification.queries'

/** Keep the shell notification cache current without coupling it to a page route. */
export function useNotificationSync() {
  const isAuthenticated = useAuthStore((state) => state.status === 'authenticated')
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!isAuthenticated || import.meta.env.MODE === 'test' || typeof window.WebSocket === 'undefined') return

    const refreshNotifications = () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all, refetchType: 'all' })
      void queryClient.invalidateQueries({ queryKey: notificationKeys.unread, refetchType: 'all' })
    }
    return connectAuthenticatedSync((connection) => {
      connection.on('NotificationsChanged', refreshNotifications)
    }, refreshNotifications)
  }, [isAuthenticated, queryClient])
}
