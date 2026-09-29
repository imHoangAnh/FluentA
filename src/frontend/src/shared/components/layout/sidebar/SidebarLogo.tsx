import { Link } from 'react-router-dom'
import logoUrl from '@/shared/assets/fluenta-wordmark.svg'

export function SidebarLogo() {
  return (
    <div className="flex h-14 w-full items-center">
      <Link
        to="/"
        aria-label="Go to overview"
        className="flex h-full min-w-0 w-full items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <img
          alt="FluentA"
          src={logoUrl}
          className="h-full w-full object-contain"
        />
      </Link>
    </div>
  )
}
