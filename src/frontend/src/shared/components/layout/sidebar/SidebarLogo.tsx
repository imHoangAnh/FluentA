import { Link } from 'react-router-dom'
import logoUrl from '@/shared/assets/fluenta-logo.webp'

export function SidebarLogo() {
  return (
    <div className="flex h-14 items-center px-1 max-[1100px]:justify-center">
      <Link
        to="/"
        aria-label="Go to overview"
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 max-[1100px]:flex-none"
      >
        <img
          alt="FluentA Logo Icon"
          src={logoUrl}
          className="size-14 shrink-0 object-contain"
        />
        <span className="min-w-0 flex-1 max-[1100px]:hidden">
          <span className="block truncate text-xl font-bold tracking-[-0.04em] text-[#2e6a64] dark:text-teal-400">FluentA</span>
        </span>
      </Link>
    </div>
  )
}
