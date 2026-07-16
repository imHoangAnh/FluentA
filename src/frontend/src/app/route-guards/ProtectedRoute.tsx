import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/features/auth'

export function ProtectedRoute() {
  const status = useAuthStore((state) => state.status)
  const user = useAuthStore((state) => state.user)
  const loadMe = useAuthStore((state) => state.loadMe)

  useEffect(() => {
    if (status === 'idle') {
      void loadMe()
    }
  }, [loadMe, status])

  if (status === 'idle' || status === 'checking') {
    return <div className="screen-status" role="status" aria-live="polite">Checking your session...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
