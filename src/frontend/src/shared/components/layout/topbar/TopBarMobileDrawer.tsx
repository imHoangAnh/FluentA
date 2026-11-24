import { LogOut, User } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { cn } from '@/shared/lib/utils'
import type { ShellAccount, ShellNavigationItem, ShellNavigationSection } from '../ShellEnvironment'
import { isNavigationItemActive } from './nav-utils'

type TopBarMobileDrawerProps = {
  navigationSections: ShellNavigationSection[]
  pathname: string
  account: ShellAccount | null
  displayName: string
  logout: () => Promise<void>
  onClose: () => void
}

export function TopBarMobileDrawer({
  navigationSections,
  pathname,
  account,
  displayName,
  logout,
  onClose,
}: TopBarMobileDrawerProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const isHomeActive = pathname === '/'

  function openItemDialog(item: ShellNavigationItem) {
    if (!item.dialogQueryParam) return
    const nextSearchParams = new URLSearchParams(searchParams)
    nextSearchParams.set(item.dialogQueryParam, 'open')
    setSearchParams(nextSearchParams, { replace: false })
  }

  return (
    <div
      id="topbar-mobile-drawer"
      className="fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto border-t border-border bg-card px-4 py-4 md:hidden"
    >
      <nav aria-label="Mobile navigation" className="grid gap-4">
        <Link
          to="/"
          aria-current={isHomeActive ? 'page' : undefined}
          onClick={onClose}
          className="flex items-center rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted/70"
        >
          <span>Home</span>
        </Link>

        {navigationSections.map((section) => (
          <div key={section.label} className="grid gap-1">
            <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
              {section.label}
            </p>
            {section.items.map((item) => {
              const dialogOpen = item.dialogQueryParam != null && searchParams.get(item.dialogQueryParam) === 'open'
              const itemActive = isNavigationItemActive(item, pathname) || dialogOpen
              const rowClassName = cn(
                'group flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-semibold text-foreground underline-offset-4 transition-colors',
                !itemActive && 'hover:underline',
              )
              const inner = (
                <span className={cn('truncate text-foreground underline-offset-4', !itemActive && 'group-hover:underline')}>
                  {item.label}
                </span>
              )

              return item.dialogQueryParam ? (
                <button
                  key={item.to}
                  type="button"
                  aria-label={item.label}
                  aria-haspopup="dialog"
                  aria-expanded={dialogOpen}
                  className={rowClassName}
                  onClick={() => {
                    onClose()
                    openItemDialog(item)
                  }}
                >
                  {inner}
                </button>
              ) : (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-label={item.label}
                  aria-current={itemActive ? 'page' : undefined}
                  className={rowClassName}
                  onClick={onClose}
                >
                  {inner}
                </Link>
              )
            })}
          </div>
        ))}

        <div className="my-1 h-px bg-border" />

        <div className="grid gap-1">
          <div className="px-3 py-1">
            <p className="truncate text-xs font-bold text-foreground">{displayName}</p>
            {account?.email ? <p className="truncate text-[11px] text-muted-foreground">{account.email}</p> : null}
          </div>

          <Link
            to="/profile"
            aria-label="Open profile"
            onClick={onClose}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted/70"
          >
            <User aria-hidden="true" className="size-4 text-muted-foreground" />
            <span className="text-foreground">Profile</span>
          </Link>

          <button
            type="button"
            aria-label="Log out"
            onClick={() => {
              onClose()
              void logout()
            }}
            className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
          >
            <LogOut aria-hidden="true" className="size-4" />
            <span>Log out</span>
          </button>
        </div>
      </nav>
    </div>
  )
}
