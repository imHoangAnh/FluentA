import { Link } from 'react-router-dom'
import { type ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'
import logoUrl from '@/shared/assets/fluenta-logo.webp'

type AuthShellMode = 'login' | 'register' | 'forgot-password' | 'new-password'

const orbitCards = [
  { language: 'Vietnamese', phrase: 'Xin chào', position: 'left-1/2 top-1/2 z-10 size-[150px] -translate-x-1/2 -translate-y-1/2', accent: 'bg-slate-400' },
  { language: 'Japanese', phrase: 'こんにちは', position: 'left-1/2 top-1/2 size-[120px] -translate-x-[260px] -translate-y-[170px]', accent: 'bg-purple-400' },
  { language: 'English', phrase: 'Hello', position: 'left-1/2 top-1/2 size-[120px] translate-x-[140px] -translate-y-[90px]', accent: 'bg-teal-400' },
  { language: 'Spanish', phrase: 'Hola', position: 'left-1/2 top-1/2 size-[120px] translate-x-[140px] translate-y-[90px]', accent: 'bg-yellow-400' },
  { language: 'Chinese', phrase: '你好', position: 'left-1/2 top-1/2 size-[120px] -translate-x-1/2 translate-y-[160px]', accent: 'bg-pink-400' },
  { language: 'Korean', phrase: '안녕하세요', position: 'left-1/2 top-1/2 size-[120px] -translate-x-[260px] translate-y-[90px]', accent: 'bg-orange-400' },
  { language: 'French', phrase: 'Bonjour', position: 'left-1/2 top-1/2 size-[120px] -translate-x-1/2 -translate-y-[240px]', accent: 'bg-blue-400' },
]

function FluentABrandHeader() {
  return (
    <div className="mb-4 flex items-end justify-center gap-3">
      <img
        alt="FluentA Logo Icon"
        src={logoUrl}
        className="size-14 object-contain"
      />
      <span className="pb-0.5 text-3xl font-bold tracking-[-0.03em] text-[#2e6a64] dark:text-teal-400">
        FluentA
      </span>
    </div>
  )
}

function AuthContextNavigation({ mode }: { mode: AuthShellMode }) {
  if (mode === 'login' || mode === 'register') {
    return (
      <nav className="mb-8 grid grid-cols-2 border-b border-slate-100" aria-label="Authentication">
        <Link to="/login" className={cn('border-b-2 px-2 pb-4 text-center text-sm font-bold no-underline transition-colors', mode === 'login' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-400 hover:text-slate-700')}>Login</Link>
        <Link to="/register" className={cn('border-b-2 px-2 pb-4 text-center text-sm font-bold no-underline transition-colors', mode === 'register' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-400 hover:text-slate-700')}>Register</Link>
      </nav>
    )
  }

  const label = mode === 'forgot-password' ? 'Forgot password' : 'New password'
  return (
    <div className="mb-8 border-b border-slate-100" aria-label="Authentication context">
      <p className="mx-auto mb-0 w-1/2 border-b-2 border-teal-600 px-2 pb-4 text-center text-sm font-bold text-teal-600">
        {label}
      </p>
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
    <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
      <span className="h-px flex-1 bg-border" />
      <span>or</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}

export function AuthShell({ children, mode }: { children: ReactNode, mode: AuthShellMode }) {
  return (
    <main className="ds-root brand-font grid min-h-screen bg-card lg:grid-cols-[3fr_2fr]">
      <section className="relative hidden min-h-screen overflow-hidden bg-[#f7f9fb] px-12 py-12 lg:flex lg:flex-col lg:items-center lg:justify-center" aria-label="About FluentA">
        <div className="relative z-10 mb-16 text-center"><FluentABrandHeader /><h1 className="m-0 max-w-sm text-xl font-normal leading-8 text-slate-600">Learn languages. Remember more.<br />Use it in real life.</h1></div>
        <div className="relative h-[450px] w-full max-w-[560px]" aria-hidden="true"><div className="absolute left-1/2 top-1/2 size-80 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-slate-200" /><div className="absolute left-1/2 top-1/2 size-[440px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-slate-200" />{orbitCards.map(({ language, phrase, position, accent }, index) => <div key={language} className={cn('absolute grid place-items-center rounded-lg bg-white px-3 py-2 text-center shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-transform duration-300', position, index === 0 && 'shadow-[0_10px_25px_rgba(0,0,0,0.08)]')}><span className="mb-1 text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-400">{language}</span><strong className={cn('text-sm text-slate-800', index === 0 && 'text-2xl text-teal-600')}>{phrase}</strong>{index > 0 ? <span className={cn('absolute right-2 top-2 size-2 rounded-full', accent)} /> : null}</div>)}</div>
        <p className="relative z-10 mt-12 font-medium text-slate-700">Learn naturally. Speak confidently.</p>
      </section>
      <section className="flex min-h-screen items-center justify-center bg-white p-6 sm:p-10 lg:p-12">
        <div className="w-full max-w-sm"><div className="mb-8 flex items-center gap-3 lg:hidden"><FluentABrandHeader /></div><AuthContextNavigation mode={mode} />{children}</div>
      </section>
    </main>
  )
}
