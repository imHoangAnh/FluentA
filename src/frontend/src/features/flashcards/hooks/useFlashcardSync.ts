import type { HubConnection } from '@microsoft/signalr'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useAuthStore } from '@/features/auth'

const apiUrl = import.meta.env.VITE_API_URL ?? 'https://localhost:7000/api/v1'
const hubUrl = `${apiUrl.replace(/\/api\/v1\/?$/, '')}/hubs/sync`

export function useFlashcardSync() {
  const isAuthenticated = useAuthStore((state) => state.status === 'authenticated')
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!isAuthenticated || import.meta.env.MODE === 'test' || typeof window.WebSocket === 'undefined') return

    let disposed = false
    let connection: HubConnection | null = null

    void import('@microsoft/signalr').then(async ({ HubConnectionBuilder }) => {
      if (disposed) return

      connection = new HubConnectionBuilder()
        .withUrl(hubUrl)
        .withAutomaticReconnect()
        .build()

      connection.on('FlashcardDeckUpdated', () => {
        void queryClient.invalidateQueries({ queryKey: ['flashcard', 'decks'] })
      })

      await connection.start()
    }).catch(() => undefined)

    return () => {
      disposed = true
      if (connection) void connection.stop()
    }
  }, [isAuthenticated, queryClient])
}
