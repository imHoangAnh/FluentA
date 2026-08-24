import { Outlet } from 'react-router-dom'
import { type ReactNode, useState } from 'react'
import { cn } from '@/shared/lib/utils'
import logoUrl from '@/shared/assets/fluenta-logo.webp'

export type AuthShellMode = 'login' | 'register' | 'forgot-password' | 'new-password'

interface LanguageCardItem {
  id: string
  language: string
  phrase: string
  accent: string
  defaultPos: { x: number; y: number }
}

const languageCards: LanguageCardItem[] = [
  { id: 'vi', language: 'Vietnamese', phrase: 'Xin chào', accent: 'bg-teal-500', defaultPos: { x: 0, y: 0 } },
  { id: 'en', language: 'English', phrase: 'Hello', accent: 'bg-emerald-400', defaultPos: { x: 120, y: -208 } },
  { id: 'es', language: 'Spanish', phrase: 'Hola', accent: 'bg-amber-400', defaultPos: { x: 240, y: 0 } },
  { id: 'zh', language: 'Chinese', phrase: '你好', accent: 'bg-rose-400', defaultPos: { x: 120, y: 208 } },
  { id: 'ko', language: 'Korean', phrase: '안녕하세요', accent: 'bg-orange-400', defaultPos: { x: -120, y: 208 } },
  { id: 'ja', language: 'Japanese', phrase: 'こんにちは', accent: 'bg-purple-400', defaultPos: { x: -240, y: 0 } },
  { id: 'fr', language: 'French', phrase: 'Bonjour', accent: 'bg-sky-400', defaultPos: { x: -120, y: -208 } },
]

function OrbitLanguageShowcase() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const activeCenterIndex = hoveredIndex ?? 0

  const handleCardHover = (index: number) => {
    // Only allow swapping once per hover session until user leaves the container
    if (hoveredIndex === null && index !== 0) {
      setHoveredIndex(index)
    }
  }

  return (
    <div
      className="relative my-auto h-[440px] w-full max-w-[560px] sm:h-[470px] sm:max-w-[600px] xl:h-[510px] xl:max-w-[660px]"
      aria-hidden="true"
      onMouseLeave={() => setHoveredIndex(null)}
    >
      <div className="absolute left-1/2 top-1/2 size-[260px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-slate-200/60" />
      <div className="absolute left-1/2 top-1/2 size-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-slate-200/90" />

      {languageCards.map((card, index) => {
        const isCenter = index === activeCenterIndex
        let targetPos = card.defaultPos
        if (isCenter) {
          targetPos = { x: 0, y: 0 }
        } else if (index === 0 && activeCenterIndex !== 0) {
          targetPos = languageCards[activeCenterIndex].defaultPos
        }

        return (
          <div
            key={card.id}
            onMouseEnter={() => handleCardHover(index)}
            style={{
              transform: `translate(calc(-50% + ${targetPos.x}px), calc(-50% + ${targetPos.y}px))`,
            }}
            className={cn(
              'absolute left-1/2 top-1/2 flex flex-col items-center justify-center rounded-xl bg-white px-3 py-1.5 text-center cursor-pointer select-none transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
              isCenter
                ? 'z-30 w-[150px] h-[100px] shadow-[0_14px_30px_rgba(0,0,0,0.1)] ring-2 ring-teal-500/30'
                : 'z-10 w-[120px] h-[80px] shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_18px_rgba(0,0,0,0.09)] border border-slate-100',
            )}
          >
            <span
              className={cn(
                'mb-0.5 text-[10px] font-bold uppercase tracking-[0.06em] transition-colors duration-300',
                isCenter ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400',
              )}
            >
              {card.language}
            </span>
            <strong
              className={cn(
                'transition-all duration-300',
                isCenter
                  ? 'text-xl sm:text-2xl font-bold text-teal-700 dark:text-teal-300'
                  : 'text-sm font-semibold text-slate-800',
              )}
            >
              {card.phrase}
            </strong>
            <span
              className={cn(
                'absolute right-2.5 top-2.5 size-2 rounded-full transition-transform duration-300',
                card.accent,
                isCenter && 'scale-125 ring-2 ring-white',
              )}
            />
          </div>
        )
      })}
    </div>
  )
}

function FluentABrandHeader({ size = 'default' }: { size?: 'default' | 'large' }) {
  if (size === 'large') {
    return (
      <div className="mb-2 flex items-center justify-center gap-3.5">
        <img
          alt="FluentA Logo Icon"
          src={logoUrl}
          className="size-[76px] object-contain xl:size-[90px]"
        />
        <span className="text-[35px] font-extrabold tracking-[-0.03em] text-[#2e6a64] xl:text-[47px] dark:text-teal-400">
          FluentA
        </span>
      </div>
    )
  }

  return (
    <div className="mb-3 flex items-center justify-center gap-2.5">
      <img
        alt="FluentA Logo Icon"
        src={logoUrl}
        className="size-[44px] object-contain sm:size-[52px]"
      />
      <span className="text-[23px] font-bold tracking-[-0.03em] text-[#2e6a64] sm:text-[29px] dark:text-teal-400">
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
    <main className="ds-root brand-font grid min-h-screen bg-card lg:h-screen lg:max-h-screen lg:grid-cols-2 lg:overflow-hidden xl:grid-cols-[1.15fr_0.85fr] 2xl:grid-cols-[3fr_2fr]">
      <section className="relative hidden min-h-screen overflow-hidden bg-[#f7f9fb] px-6 pt-3 pb-2.5 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:items-center lg:justify-between xl:px-12 xl:pt-4 xl:pb-3" aria-label="About FluentA">
        <div className="relative z-10 text-center">
          <FluentABrandHeader size="large" />
        </div>
        <OrbitLanguageShowcase />
        <p className="relative z-10 m-0 font-medium text-slate-700">
          Start building your second brain with FluentA
        </p>
      </section>
      <section className="flex min-h-screen items-center justify-center bg-white px-6 py-6 sm:px-8 sm:py-8 lg:h-full lg:min-h-0 lg:overflow-y-auto lg:px-8 lg:py-6 xl:px-12 xl:py-10">
        <div className="w-full max-w-[430px] sm:max-w-[460px] xl:max-w-[490px]">
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
