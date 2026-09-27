import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AuthDialog, type AuthDialogEntryMode } from '@/features/auth/components/AuthDialog'
import { LandingPage } from '../components/LandingPage'

export function GuestLandingPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const entryState = location.state as { authMode?: AuthDialogEntryMode; authNotice?: string } | null
  const [authMode, setAuthMode] = useState<AuthDialogEntryMode | null>(() => entryState?.authMode ?? null)
  const [authNotice, setAuthNotice] = useState<string | null>(() => entryState?.authNotice ?? null)

  useEffect(() => {
    if (entryState?.authMode || entryState?.authNotice) {
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [entryState?.authMode, entryState?.authNotice, location.pathname, navigate])

  function closeAuthDialog(open: boolean) {
    if (!open) {
      setAuthMode(null)
      setAuthNotice(null)
    }
  }

  return (
    <>
      <LandingPage
        onLogin={() => { setAuthNotice(null); setAuthMode('login') }}
        onRegister={() => { setAuthNotice(null); setAuthMode('register') }}
        onGetStarted={() => { setAuthNotice(null); setAuthMode('login') }}
      />
      <AuthDialog
        open={authMode !== null}
        initialMode={authMode ?? 'login'}
        initialNotice={authNotice}
        onOpenChange={closeAuthDialog}
      />
    </>
  )
}
