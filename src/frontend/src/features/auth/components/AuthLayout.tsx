import { Outlet } from 'react-router-dom'
import wordmarkUrl from '@/shared/assets/fluenta-wordmark.svg'

export function AuthLayout() {
  return (
    <main className="ds-root brand-font flex min-h-screen min-h-[100svh] flex-col items-center bg-[#F0FAFA] px-4 py-8">
      <div className="my-auto w-full max-w-[520px] p-6 sm:p-0">
        <img alt="FluentA" src={wordmarkUrl} className="mb-6 h-[60px] w-[154px] object-contain object-left" />
        <Outlet />
      </div>
    </main>
  )
}
