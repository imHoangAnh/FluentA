import { Outlet } from 'react-router-dom'
import wordmarkUrl from '@/shared/assets/fluenta-wordmark.svg'

export function AuthLayout() {
  return (
    <main className="ds-root brand-font flex min-h-screen min-h-[100svh] flex-col items-center bg-[#f7f9f8] px-4 py-8">
      <div className="my-auto w-full max-w-[500px] rounded-2xl border border-border bg-card p-8 shadow-[var(--ds-shadow-md)]">
        <img alt="FluentA" src={wordmarkUrl} className="mb-6 h-[52px] w-[140px] object-contain object-left" />
        <Outlet />
      </div>
    </main>
  )
}
