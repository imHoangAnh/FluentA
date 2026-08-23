import { useEffect, useRef, useState } from 'react'
import { Button } from '@/shared/components/ui/button'

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

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
      />
    </svg>
  )
}

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
        width: 400,
      })
      setIsReady(true)
    }).catch(() => {
      if (active) setMessage('Google sign-in is temporarily unavailable.')
    })

    return () => { active = false }
  }, [clientId, onCredential])

  return (
    <div className="grid gap-2">
      <Button
        variant="outline"
        type="button"
        disabled={!clientId || !isReady}
        className="relative h-10 w-full rounded-lg border border-input bg-card text-sm font-semibold text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground sm:h-11 sm:text-base xl:h-12"
      >
        <GoogleIcon className="mr-2 size-5 shrink-0" />
        <span>Continue with Google</span>
        {clientId ? (
          <div
            ref={containerRef}
            className="absolute inset-0 z-10 cursor-pointer overflow-hidden opacity-[0.001] [&_iframe]:!h-full [&_iframe]:!w-full"
            aria-hidden="true"
          />
        ) : null}
      </Button>
      {message ? <p role="status" className="m-0 text-center text-sm text-muted-foreground">{message}</p> : null}
    </div>
  )
}
