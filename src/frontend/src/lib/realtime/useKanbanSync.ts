import type { HubConnection } from '@microsoft/signalr'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useAuthStore } from '@/features/auth'

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:5000/api/v1'
const hubUrl = `${apiUrl.replace(/\/api\/v1\/?$/, '')}/hubs/sync`

export function useKanbanSync() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!accessToken || import.meta.env.MODE === 'test' || typeof window.WebSocket === 'undefined') return

    let disposed = false
    let connection: HubConnection | null = null

    void import('@microsoft/signalr').then(async ({ HubConnectionBuilder }) => {
      if (disposed) return

      connection = new HubConnectionBuilder()
        .withUrl(hubUrl, { accessTokenFactory: () => accessToken })
        .withAutomaticReconnect()
        .build()

      connection.on('KanbanCardMoved', () => {
        void queryClient.invalidateQueries({ queryKey: ['kanban'], refetchType: 'all' })
      })

      await connection.start()
    }).catch(() => undefined)

    return () => {
      disposed = true
      if (connection) void connection.stop()
    }
  }, [accessToken, queryClient])
}
