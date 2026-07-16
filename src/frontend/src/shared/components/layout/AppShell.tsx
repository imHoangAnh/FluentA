import {
  Bell,
  BookOpenText,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'
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
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const {
    account,
    displayName,
    avatarUrl,
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
        collapsed && 'justify-center px-0',
        'max-[1100px]:justify-center max-[1100px]:px-0',
      )}
    >
      <Icon className="size-[18px]" aria-hidden="true" />
      <span className={cn('truncate', collapsed && 'sr-only', 'max-[1100px]:sr-only')}>{label}</span>
    </Link>
    )
  }
  const SettingsIcon = settingsNavigation.icon
  const notificationsActive = location.pathname === notificationsPath || location.pathname.startsWith(`${notificationsPath}/`)

  return (
    <div className="ds-root flex min-h-screen bg-background">
      <aside
        className={cn(
          'sticky top-0 z-30 flex h-screen shrink-0 flex-col border-r border-border bg-card py-4 transition-[width] duration-200',
          collapsed ? 'w-[84px] px-1' : 'w-[184px] px-2',
          'max-[1100px]:w-[84px] max-[1100px]:px-1',
        )}
        aria-label="Primary navigation"
      >
        <div className={cn('flex h-12 items-center gap-1 px-1', collapsed && 'justify-center', 'max-[1100px]:justify-center')}>
          <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <BookOpenText className="size-5" aria-hidden="true" />
          </div>
          <div className={cn('min-w-0 flex-1', collapsed && 'hidden', 'max-[1100px]:hidden')}>
            <p className="m-0 text-base font-bold tracking-[-0.02em] text-foreground">FluentA</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0 max-[1100px]:hidden"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            onClick={() => setCollapsed((value) => !value)}
          >
            {collapsed ? <ChevronRight /> : <ChevronLeft />}
          </Button>
        </div>

        <nav className="mt-6 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto" aria-label="Application">
          {navigationSections.map((section) => (
            <div className="grid gap-1" key={section.label}>
              <p className={cn('mb-1 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground', collapsed && 'sr-only', 'max-[1100px]:sr-only')}>{section.label}</p>
              {section.items.map(navItem)}
            </div>
          ))}
        </nav>

        <div className="mt-4 grid gap-2 border-t border-border pt-4">
          {notificationsMenu ? notificationsMenu(collapsed, notificationsActive) : (
            <Link
              to={notificationsPath}
              aria-label="Notifications"
              aria-current={notificationsActive ? 'page' : undefined}
              className={cn('flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground', notificationsActive && 'bg-secondary text-secondary-foreground', collapsed && 'justify-center px-0', 'max-[1100px]:justify-center max-[1100px]:px-0')}
            >
              <Bell className="size-[18px]" aria-hidden="true" />
              <span className={cn(collapsed && 'sr-only', 'max-[1100px]:sr-only')}>Notifications</span>
            </Link>
          )}
          <Link
            to={settingsNavigation.to}
            aria-label="Settings"
            aria-current={location.pathname === settingsNavigation.to || location.pathname.startsWith(`${settingsNavigation.to}/`) ? 'page' : undefined}
            className={cn('flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground', (location.pathname === settingsNavigation.to || location.pathname.startsWith(`${settingsNavigation.to}/`)) && 'bg-secondary text-secondary-foreground', collapsed && 'justify-center px-0', 'max-[1100px]:justify-center max-[1100px]:px-0')}
          >
            <SettingsIcon className="size-[18px]" aria-hidden="true" />
            <span className={cn(collapsed && 'sr-only', 'max-[1100px]:sr-only')}>{settingsNavigation.label}</span>
          </Link>
          <div className={cn('flex min-w-0 items-center gap-3 overflow-hidden rounded-md border border-border bg-background p-2', collapsed && 'justify-center border-0 bg-transparent', 'max-[1100px]:justify-center max-[1100px]:border-0 max-[1100px]:bg-transparent')}>
            <img className="size-8 shrink-0 rounded-full border border-border object-cover" src={avatarUrl} alt="" />
            <div className={cn('min-w-0 flex-1 overflow-hidden', collapsed && 'hidden', 'max-[1100px]:hidden')}>
              <p className="m-0 max-w-full truncate text-xs font-semibold text-foreground">{displayName}</p>
              <p className="m-0 max-w-full truncate text-[11px] text-muted-foreground">{account?.email}</p>
            </div>
            <Button className={cn(collapsed && 'hidden', 'max-[1100px]:hidden')} variant="ghost" size="icon-sm" aria-label="Logout" onClick={() => void logout()}>
              <LogOut />
            </Button>
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
