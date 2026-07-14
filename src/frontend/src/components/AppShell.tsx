import {
  Bell,
  BookOpenText,
  CalendarClock,
  CheckSquare2,
  ChevronLeft,
  ChevronRight,
  Columns3,
  FileText,
  Flame,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  NotebookPen,
  Settings,
  Timer,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { getUserAvatarUrl } from '@/lib/avatar'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const primaryNav = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/vocabulary', label: 'Vocabulary', icon: BookOpenText },
  { to: '/flashcards', label: 'Flashcard', icon: GraduationCap },
  { to: '/practice', label: 'Practice', icon: BookOpenText },
  { to: '/review', label: 'Review', icon: Flame },
]

const productivityNav = [
  { to: '/todo', label: 'Todo', icon: CheckSquare2 },
  { to: '/habits', label: 'Habits', icon: Columns3 },
  { to: '/countdowns', label: 'Countdowns', icon: CalendarClock },
  { to: '/journal', label: 'Journal', icon: NotebookPen },
  { to: '/notes', label: 'Notes', icon: FileText },
  { to: '/kanban', label: 'Kanban', icon: Columns3 },
  { to: '/pomodoro', label: 'Pomodoro', icon: Timer },
]

type AppShellProps = {
  children: ReactNode
  title: string
  description?: string
  headerActions?: ReactNode
  contentClassName?: string
}

export function AppShell({ children, title, description, headerActions, contentClassName }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const displayName = user?.fullName || user?.email?.split('@')[0] || 'Learner'
  const avatarUrl = getUserAvatarUrl(user, displayName)

  const isPracticeRoute = location.pathname === '/practice'
    || /^\/practice\/[^/]+$/.test(location.pathname)

  const navItem = ({ to, label, icon: Icon, end }: (typeof primaryNav)[number]) => {
    const isActive = end
      ? location.pathname === to
      : to === '/practice'
        ? isPracticeRoute
        : to === '/flashcards'
          ? location.pathname.startsWith('/flashcards') && !isPracticeRoute
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
          <div className="grid gap-1">
            <p className={cn('mb-1 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground', collapsed && 'sr-only', 'max-[1100px]:sr-only')}>Learning</p>
            {primaryNav.map(navItem)}
          </div>
          <div className="grid gap-1">
            <p className={cn('mb-1 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground', collapsed && 'sr-only', 'max-[1100px]:sr-only')}>Productivity</p>
            {productivityNav.map(navItem)}
          </div>
        </nav>

        <div className="mt-4 grid gap-2 border-t border-border pt-4">
          <NavLink
            to="/settings"
            aria-label="Settings"
            className={({ isActive }) => cn('flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground', isActive && 'bg-secondary text-secondary-foreground', collapsed && 'justify-center px-0', 'max-[1100px]:justify-center max-[1100px]:px-0')}
          >
            <Settings className="size-[18px]" aria-hidden="true" />
            <span className={cn(collapsed && 'sr-only', 'max-[1100px]:sr-only')}>Settings</span>
          </NavLink>
          <div className={cn('flex min-w-0 items-center gap-3 overflow-hidden rounded-md border border-border bg-background p-2', collapsed && 'justify-center border-0 bg-transparent', 'max-[1100px]:justify-center max-[1100px]:border-0 max-[1100px]:bg-transparent')}>
            <img className="size-8 shrink-0 rounded-full border border-border object-cover" src={avatarUrl} alt="" />
            <div className={cn('min-w-0 flex-1 overflow-hidden', collapsed && 'hidden', 'max-[1100px]:hidden')}>
              <p className="m-0 max-w-full truncate text-xs font-semibold text-foreground">{displayName}</p>
              <p className="m-0 max-w-full truncate text-[11px] text-muted-foreground">{user?.email}</p>
            </div>
            <Button className={cn(collapsed && 'hidden', 'max-[1100px]:hidden')} variant="ghost" size="icon-sm" aria-label="Logout" onClick={() => void logout()}>
              <LogOut />
            </Button>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex h-14 min-h-14 items-center justify-between gap-4 border-b border-border bg-background/95 px-5 backdrop-blur lg:px-6">
          <div className="min-w-0 py-2">
            <h1 className="m-0 truncate text-xl font-semibold tracking-[-0.02em] text-foreground">{title}</h1>
            {description ? <p className="m-0 mt-1 truncate text-sm text-muted-foreground">{description}</p> : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {headerActions}
            <Button asChild variant="ghost" size="icon" aria-label="Notifications">
              <NavLink to="/notifications"><Bell /></NavLink>
            </Button>
          </div>
        </header>
        <main id="main-content" className={cn('mx-auto w-full max-w-[1480px] p-6 lg:p-8', contentClassName)}>
          {children}
        </main>
      </div>
    </div>
  )
}
