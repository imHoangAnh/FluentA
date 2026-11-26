import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/features/auth'
import { GuestLandingPage } from '@/features/landing'

export function ProtectedRoute() {
  const location = useLocation()
  const status = useAuthStore((state) => state.status)
  const user = useAuthStore((state) => state.user)
  const loadMe = useAuthStore((state) => state.loadMe)
  const [sessionResolved, setSessionResolved] = useState(status === 'anonymous' || status === 'authenticated')

  useEffect(() => {
    if (status === 'idle') {
      void loadMe()
    }
  }, [loadMe, status])

  if (!sessionResolved && (status === 'anonymous' || status === 'authenticated')) {
    setSessionResolved(true)
  }

  if (!sessionResolved && (status === 'idle' || status === 'checking')) {
    return <div className="screen-status" role="status" aria-live="polite">Checking your session...</div>
  }

  if (!user) {
    if (location.pathname === '/') {
      return <GuestLandingPage />
    }

    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
