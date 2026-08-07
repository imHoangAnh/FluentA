import {
  Bell,
  LogOut,
  Trash2,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import { useShellEnvironment, type ShellNavigationItem } from './ShellEnvironment'

type AppShellProps = {
  children: ReactNode
  title: string
  description?: string
  contentClassName?: string
}

export function AppShell({ children, title, description, contentClassName }: AppShellProps) {
  const location = useLocation()
  const {
    account,
    displayName,
    avatarImageUrl,
    logout,
    navigationSections,
    notificationsMenu,
    notificationsPath,
    settingsNavigation,
  } = useShellEnvironment()

  const navItem = ({ to, label, icon: Icon, end, isActive: matchRoute }: ShellNavigationItem) => {
    const isActive = matchRoute
      ? matchRoute(location.pathname)
      : end
        ? location.pathname === to
        : location.pathname === to || location.pathname.startsWith(`${to}/`)

    return (
    <Link
      key={to}
      to={to}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'group flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-accent-foreground',
        isActive && 'bg-secondary text-secondary-foreground',
        'max-[1100px]:justify-center max-[1100px]:px-0',
      )}
    >
      <Icon className="size-[18px]" aria-hidden="true" />
      <span className="truncate max-[1100px]:sr-only">{label}</span>
    </Link>
    )
  }
  const SettingsIcon = settingsNavigation.icon
  const notificationsActive = location.pathname === notificationsPath || location.pathname.startsWith(`${notificationsPath}/`)

  return (
    <div className="ds-root flex min-h-screen bg-background">
      <aside
        className={cn(
          'sticky top-0 z-30 flex h-screen w-[184px] shrink-0 flex-col border-r border-border bg-card px-2 py-4',
          'max-[1100px]:w-[84px] max-[1100px]:px-1',
        )}
        aria-label="Primary navigation"
      >
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

        <nav className="mt-6 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto" aria-label="Application">
          {navigationSections.map((section) => (
            <div className="grid gap-1" key={section.label}>
              <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground max-[1100px]:sr-only">{section.label}</p>
              {section.items.map(navItem)}
            </div>
          ))}
        </nav>

        <div className="mt-4 grid gap-2 border-t border-border pt-4">
          {notificationsMenu ? notificationsMenu(notificationsActive) : (
            <Link
              to={notificationsPath}
              aria-label="Notifications"
              aria-current={notificationsActive ? 'page' : undefined}
              className={cn('flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground', notificationsActive && 'bg-secondary text-secondary-foreground', 'max-[1100px]:justify-center max-[1100px]:px-0')}
            >
              <Bell className="size-[18px]" aria-hidden="true" />
              <span className="max-[1100px]:sr-only">Notifications</span>
            </Link>
          )}
          <Link
            to="/trash"
            aria-label="Trash"
            aria-current={location.pathname === '/trash' || location.pathname.startsWith('/trash/') ? 'page' : undefined}
            className={cn('flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground', (location.pathname === '/trash' || location.pathname.startsWith('/trash/')) && 'bg-secondary text-secondary-foreground', 'max-[1100px]:justify-center max-[1100px]:px-0')}
          >
            <Trash2 className="size-[18px]" aria-hidden="true" />
            <span className="max-[1100px]:sr-only">Trash</span>
          </Link>
          <Link
            to={settingsNavigation.to}
            aria-label="Settings"
            aria-current={location.pathname === settingsNavigation.to || location.pathname.startsWith(`${settingsNavigation.to}/`) ? 'page' : undefined}
            className={cn('flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground', (location.pathname === settingsNavigation.to || location.pathname.startsWith(`${settingsNavigation.to}/`)) && 'bg-secondary text-secondary-foreground', 'max-[1100px]:justify-center max-[1100px]:px-0')}
          >
            <SettingsIcon className="size-[18px]" aria-hidden="true" />
            <span className="max-[1100px]:sr-only">{settingsNavigation.label}</span>
          </Link>
          <div className="flex min-w-0 items-center gap-2 rounded-md border border-border bg-background p-2 max-[1100px]:justify-center max-[1100px]:border-0 max-[1100px]:bg-transparent">
            <Link
              to="/profile"
              aria-label="Open profile"
              className="flex min-w-0 flex-1 items-center gap-3 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 max-[1100px]:flex-none"
            >
              <img className="size-8 shrink-0 rounded-full border border-border object-cover" src={avatarImageUrl} alt="" />
              <span className="min-w-0 flex-1 overflow-hidden max-[1100px]:hidden">
                <span className="block max-w-full truncate text-xs font-semibold text-foreground">{displayName}</span>
                <span className="block max-w-full truncate text-[11px] text-muted-foreground">{account?.email}</span>
              </span>
            </Link>
            <span className="group/logout relative shrink-0 max-[1100px]:hidden">
              <Button variant="ghost" size="icon-sm" aria-label="Log out" aria-describedby="logout-tooltip" onClick={() => void logout()}>
                <LogOut />
              </Button>
              <span
                id="logout-tooltip"
                role="tooltip"
                className="pointer-events-none absolute bottom-full right-0 z-50 mb-2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs font-medium text-popover-foreground opacity-0 shadow-sm transition-opacity group-hover/logout:opacity-100 group-focus-within/logout:opacity-100"
              >
                Log out
              </span>
            </span>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <main id="main-content" className={cn('mx-auto w-full max-w-[1480px] p-6 lg:p-8', contentClassName)}>
          <h1 className="sr-only">{title}</h1>
          {description ? <p className="sr-only">{description}</p> : null}
          {children}
        </main>
      </div>
    </div>
  )
}
