import { connectAuthenticatedSync } from '@/shared/api/realtime'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useAuthStore } from '@/features/auth'
import { flashcardKeys } from '../api/flashcard.queries'

export function useFlashcardSync() {
  const isAuthenticated = useAuthStore((state) => state.status === 'authenticated')
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!isAuthenticated || import.meta.env.MODE === 'test' || typeof window.WebSocket === 'undefined') return

    return connectAuthenticatedSync((connection) => {
      connection.on('FlashcardDeckUpdated', () => {
        void queryClient.invalidateQueries({ queryKey: flashcardKeys.decks })
      })
    })
  }, [isAuthenticated, queryClient])
}
