import { Outlet } from 'react-router-dom'
import { type ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'
import logoUrl from '@/shared/assets/fluenta-logo.webp'

export type AuthShellMode = 'login' | 'register' | 'forgot-password' | 'new-password'

const orbitCards = [
  { language: 'Vietnamese', phrase: 'Xin chào', position: 'left-1/2 top-1/2 z-10 size-[150px] -translate-x-1/2 -translate-y-1/2', accent: 'bg-slate-400' },
  { language: 'Japanese', phrase: 'こんにちは', position: 'left-1/2 top-1/2 size-[120px] -translate-x-[260px] -translate-y-[170px]', accent: 'bg-purple-400' },
  { language: 'English', phrase: 'Hello', position: 'left-1/2 top-1/2 size-[120px] translate-x-[140px] -translate-y-[90px]', accent: 'bg-teal-400' },
  { language: 'Spanish', phrase: 'Hola', position: 'left-1/2 top-1/2 size-[120px] translate-x-[140px] translate-y-[90px]', accent: 'bg-yellow-400' },
  { language: 'Chinese', phrase: '你好', position: 'left-1/2 top-1/2 size-[120px] -translate-x-1/2 translate-y-[160px]', accent: 'bg-pink-400' },
  { language: 'Korean', phrase: '안녕하세요', position: 'left-1/2 top-1/2 size-[120px] -translate-x-[260px] translate-y-[90px]', accent: 'bg-orange-400' },
  { language: 'French', phrase: 'Bonjour', position: 'left-1/2 top-1/2 size-[120px] -translate-x-1/2 -translate-y-[240px]', accent: 'bg-blue-400' },
]

function FluentABrandHeader({ size = 'default' }: { size?: 'default' | 'large' }) {
  if (size === 'large') {
    return (
      <div className="mb-4 flex items-center justify-center gap-4">
        <img
          alt="FluentA Logo Icon"
          src={logoUrl}
          className="size-20 object-contain xl:size-24"
        />
        <span className="text-4xl font-extrabold tracking-[-0.03em] text-[#2e6a64] xl:text-5xl dark:text-teal-400">
          FluentA
        </span>
      </div>
    )
  }

  return (
    <div className="mb-4 flex items-center justify-center gap-3">
      <img
        alt="FluentA Logo Icon"
        src={logoUrl}
        className="size-12 object-contain sm:size-14"
      />
      <span className="text-2xl font-bold tracking-[-0.03em] text-[#2e6a64] sm:text-3xl dark:text-teal-400">
        FluentA
      </span>
    </div>
  )
}

export function AuthFormHeader({ title, description }: { title: string, description: ReactNode }) {
  return (
    <div className="mb-7">
      <h1 className="m-0 text-2xl font-semibold tracking-[-0.02em] text-foreground">{title}</h1>
      <p className="m-0 mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  )
}

export function AuthDivider() {
  return (
    <div className="my-3.5 flex items-center gap-4 text-sm text-muted-foreground sm:my-4 xl:my-5">
      <span className="h-px flex-1 bg-border" />
      <span>or</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}

export function AuthShell({ children }: { children: ReactNode, mode?: AuthShellMode }) {
  return (
    <main className="ds-root brand-font grid min-h-screen bg-card lg:grid-cols-2 xl:grid-cols-[1.15fr_0.85fr] 2xl:grid-cols-[3fr_2fr]">
      <section className="relative hidden min-h-screen overflow-hidden bg-[#f7f9fb] px-6 py-8 lg:flex lg:flex-col lg:items-center lg:justify-between xl:px-12 xl:py-12" aria-label="About FluentA">
        <div className="relative z-10 text-center">
          <FluentABrandHeader size="large" />
        </div>
        <div className="relative my-auto h-[340px] w-full max-w-[480px] sm:h-[380px] sm:max-w-[520px] xl:h-[450px] xl:max-w-[560px]" aria-hidden="true">
          <div className="absolute left-1/2 top-1/2 size-64 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-slate-200 sm:size-72 xl:size-80" />
          <div className="absolute left-1/2 top-1/2 size-[340px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-slate-200 sm:size-[380px] xl:size-[440px]" />
          {orbitCards.map(({ language, phrase, position, accent }, index) => (
            <div
              key={language}
              className={cn(
                'absolute grid place-items-center rounded-lg bg-white px-3 py-2 text-center shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-transform duration-300',
                position,
                index === 0 && 'shadow-[0_10px_25px_rgba(0,0,0,0.08)]',
              )}
            >
              <span className="mb-1 text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-400">{language}</span>
              <strong className={cn('text-sm text-slate-800', index === 0 && 'text-2xl text-teal-600')}>{phrase}</strong>
              {index > 0 ? <span className={cn('absolute right-2 top-2 size-2 rounded-full', accent)} /> : null}
            </div>
          ))}
        </div>
        <p className="relative z-10 mt-4 font-medium text-slate-700 sm:mt-6 xl:mt-8">
          Start building your second brain with FluentA
        </p>
      </section>
      <section className="flex min-h-screen items-center justify-center bg-white px-6 py-6 sm:px-8 sm:py-8 lg:px-8 lg:py-6 xl:px-12 xl:py-10">
        <div className="w-full max-w-[420px] sm:max-w-[450px] xl:max-w-[480px]">
          <div className="mb-4 flex items-center gap-3 lg:hidden sm:mb-5">
            <FluentABrandHeader />
          </div>
          {children}
        </div>
      </section>
    </main>
  )
}

export function AuthLayout() {
  return (
    <AuthShell>
      <Outlet />
    </AuthShell>
  )
}
