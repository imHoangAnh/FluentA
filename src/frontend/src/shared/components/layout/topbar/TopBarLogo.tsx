import { Link } from 'react-router-dom'
import wordmarkUrl from '@/shared/assets/fluenta-wordmark.svg'

export function TopBarLogo() {
  return (
    <div className="flex min-w-0 shrink-0 items-center md:min-w-[140px] lg:min-w-[196px]">
      <Link
        to="/"
        aria-label="Go to overview"
        className="inline-flex items-center rounded-lg py-1 pr-2 outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <img
          alt="FluentA"
          src={wordmarkUrl}
          className="h-10 w-auto object-contain object-left"
        />
      </Link>
    </div>
  )
}
