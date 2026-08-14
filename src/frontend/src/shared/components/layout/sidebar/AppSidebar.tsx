import { Bell, Trash2 } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/shared/lib/utils'
import { useShellEnvironment } from '../ShellEnvironment'
import { SidebarAccount } from './SidebarAccount'
import { SidebarLogo } from './SidebarLogo'
import { SidebarNavigation } from './SidebarNavigation'

export function AppSidebar() {
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
  const SettingsIcon = settingsNavigation.icon
  const notificationsActive = location.pathname === notificationsPath || location.pathname.startsWith(`${notificationsPath}/`)
  const trashActive = location.pathname === '/trash' || location.pathname.startsWith('/trash/')
  const settingsActive = location.pathname === settingsNavigation.to || location.pathname.startsWith(`${settingsNavigation.to}/`)

  return (
    <aside
      className={cn(
        'sticky top-0 z-30 flex h-screen w-[184px] shrink-0 flex-col border-r border-border bg-card px-2 py-4',
        'max-[1100px]:w-[84px] max-[1100px]:px-1',
      )}
      aria-label="Primary navigation"
    >
      <SidebarLogo />
      <SidebarNavigation navigationSections={navigationSections} pathname={location.pathname} />

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
          aria-current={trashActive ? 'page' : undefined}
          className={cn('flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground', trashActive && 'bg-secondary text-secondary-foreground', 'max-[1100px]:justify-center max-[1100px]:px-0')}
        >
          <Trash2 className="size-[18px]" aria-hidden="true" />
          <span className="max-[1100px]:sr-only">Trash</span>
        </Link>
        <Link
          to={settingsNavigation.to}
          aria-label="Settings"
          aria-current={settingsActive ? 'page' : undefined}
          className={cn('flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground', settingsActive && 'bg-secondary text-secondary-foreground', 'max-[1100px]:justify-center max-[1100px]:px-0')}
        >
          {SettingsIcon ? <SettingsIcon className="size-[18px]" aria-hidden="true" /> : null}
          <span className="max-[1100px]:sr-only">{settingsNavigation.label}</span>
        </Link>
        <SidebarAccount account={account} displayName={displayName} avatarImageUrl={avatarImageUrl} logout={logout} />
      </div>
    </aside>
  )
}
