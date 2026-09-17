import type { HubConnection } from '@microsoft/signalr'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useAuthStore } from '@/features/auth'
import { notificationKeys } from '../api/notification.queries'

const apiUrl = import.meta.env.VITE_API_URL ?? 'https://localhost:7000/api/v1'
const hubUrl = `${apiUrl.replace(/\/api\/v1\/?$/, '')}/hubs/sync`
const initialRetryDelaysMs = [1_000, 5_000, 15_000, 30_000] as const

/** Keep the shell notification cache current without coupling it to a page route. */
export function useNotificationSync() {
  const isAuthenticated = useAuthStore((state) => state.status === 'authenticated')
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!isAuthenticated || import.meta.env.MODE === 'test' || typeof window.WebSocket === 'undefined') return

    let disposed = false
    let connection: HubConnection | null = null
    let retryTimer: number | null = null
    let retryAttempt = 0

    const refreshNotifications = () => {
      if (disposed) return
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all, refetchType: 'all' })
      void queryClient.invalidateQueries({ queryKey: notificationKeys.unread, refetchType: 'all' })
    }

    void import('@microsoft/signalr').then(async ({ HubConnectionBuilder }) => {
      if (disposed) return

      connection = new HubConnectionBuilder()
        .withUrl(hubUrl)
        .withAutomaticReconnect()
        .build()

      const startConnection = async (): Promise<void> => {
        if (disposed || !connection) return

        try {
          await connection.start()
          retryAttempt = 0
          refreshNotifications()
        } catch {
          if (disposed) return
          scheduleRetry()
        }
      }

      const scheduleRetry = () => {
        if (disposed || retryTimer !== null) return

        const delay = initialRetryDelaysMs[Math.min(retryAttempt, initialRetryDelaysMs.length - 1)]
        retryAttempt += 1
        retryTimer = window.setTimeout(() => {
          retryTimer = null
          void startConnection()
        }, delay)
      }

      connection.on('NotificationsChanged', refreshNotifications)
      connection.onreconnected(() => {
        retryAttempt = 0
        refreshNotifications()
      })
      // SignalR stops retrying after its automatic reconnect policy is exhausted.
      // Start a bounded backoff loop so a long outage recovers without remounting.
      connection.onclose(() => scheduleRetry())

      await startConnection()
    }).catch(() => undefined)

    return () => {
      disposed = true
      if (retryTimer !== null) window.clearTimeout(retryTimer)
      if (connection) {
        connection.off('NotificationsChanged', refreshNotifications)
        void connection.stop()
      }
    }
  }, [isAuthenticated, queryClient])
}
