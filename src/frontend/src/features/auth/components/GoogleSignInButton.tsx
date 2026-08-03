import { useEffect, useRef, useState } from 'react'

type Props = {
  onCredential: (idToken: string) => Promise<void>
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: { client_id: string; callback: (response: { credential?: string }) => void }) => void
          renderButton: (element: HTMLElement, options: Record<string, string | number>) => void
        }
      }
    }
  }
}

const scriptId = 'google-identity-services'

function loadGoogleIdentityServices() {
  if (window.google?.accounts.id) return Promise.resolve()
  return new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(scriptId) as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Google sign-in failed to load.')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.id = scriptId
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Google sign-in failed to load.'))
    document.head.appendChild(script)
  })
}

export function GoogleSignInButton({ onCredential }: Props) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
  const containerRef = useRef<HTMLDivElement>(null)
  const [message, setMessage] = useState<string | null>(clientId ? null : 'Google sign-in is not configured locally.')
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (!clientId) {
      return
    }

    let active = true
    void loadGoogleIdentityServices().then(() => {
      if (!active || !containerRef.current || !window.google) return
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          if (!response.credential) {
            setMessage('Google did not return an identity token.')
            return
          }
          setMessage(null)
          void onCredential(response.credential).catch(() => undefined)
        },
      })
      containerRef.current.replaceChildren()
      window.google.accounts.id.renderButton(containerRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        width: 360,
      })
      setIsReady(true)
    }).catch(() => {
      if (active) setMessage('Google sign-in is temporarily unavailable.')
    })

    return () => { active = false }
  }, [clientId, onCredential])

  if (!clientId) {
    return (
      <div className="grid gap-2">
        <button type="button" disabled className="h-10 w-full rounded-md border border-input bg-card text-sm font-semibold text-muted-foreground">
          Continue with Google
        </button>
        <p role="status" className="m-0 text-sm text-muted-foreground">{message}</p>
      </div>
    )
  }

  return (
    <div className="grid justify-items-center gap-2">
      {!isReady ? (
        <button type="button" disabled className="h-10 w-full rounded-md border border-input bg-card text-sm font-semibold text-muted-foreground">
          Continue with Google
        </button>
      ) : null}
      <div ref={containerRef} className="min-h-10 w-full overflow-hidden" aria-label="Continue with Google" />
      {message ? <p role="status" className="m-0 text-sm text-muted-foreground">{message}</p> : null}
    </div>
  )
}
