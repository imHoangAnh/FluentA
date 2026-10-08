import { useContext, useEffect, useRef, useState } from 'react'
import { UNSAFE_DataRouterContext, useBlocker } from 'react-router-dom'

// Pages also render in a MemoryRouter in focused component tests.
export function useUnsavedNavigation(dirty: boolean) {
  const [pending, setPending] = useState<(() => void) | null>(null)
  const transition = useRef<(() => void) | null>(null)
  useEffect(() => {
    if (!dirty) return
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [dirty])
  function request(action: () => void) {
    if (dirty) { transition.current = action; setPending(() => action) }
    else action()
  }
  function stay() { setPending(null); transition.current = null }
  function discard() { const action = transition.current; stay(); action?.() }
  return { open: pending !== null, request, stay, discard }
}

export function useIsDataRouter() { return useContext(UNSAFE_DataRouterContext) !== null }

export function RouteDraftGuard({ dirty, onDiscard, render }: { dirty: boolean; onDiscard: () => void; render: (open: boolean, stay: () => void, discard: () => void) => React.ReactNode }) {
  const blocker = useBlocker(dirty)
  return render(blocker.state === 'blocked', () => { if (blocker.state === 'blocked') blocker.reset() }, () => { onDiscard(); if (blocker.state === 'blocked') blocker.proceed() })
}
