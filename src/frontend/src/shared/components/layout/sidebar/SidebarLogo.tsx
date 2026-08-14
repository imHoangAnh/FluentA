import { Link } from 'react-router-dom'

export function SidebarLogo() {
  return (
    <div className="flex h-14 items-center px-1 max-[1100px]:justify-center">
      <Link
        to="/"
        aria-label="Go to overview"
        className="flex min-w-0 flex-1 items-end gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 max-[1100px]:flex-none"
      >
        <img
          src="http://localhost:9000/fluenta-assets-dev/public/logo.png"
          onError={(e) => {
            const target = e.currentTarget
            if (target.src !== `${window.location.origin}/logo.png`) {
              target.src = '/logo.png'
            }
          }}
          alt="FluentA Logo Icon"
          className="size-14 shrink-0 object-contain"
        />
        <span className="min-w-0 flex-1 max-[1100px]:hidden pb-1">
          <span className="block truncate text-xl font-bold tracking-[-0.03em] text-[#2e6a64] dark:text-teal-400">FluentA</span>
        </span>
      </Link>
    </div>
  )
}
