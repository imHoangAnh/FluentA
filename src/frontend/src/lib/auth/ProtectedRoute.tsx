import { type ReactNode, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const status = useAuthStore((state) => state.status)
  const user = useAuthStore((state) => state.user)
  const loadMe = useAuthStore((state) => state.loadMe)

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
