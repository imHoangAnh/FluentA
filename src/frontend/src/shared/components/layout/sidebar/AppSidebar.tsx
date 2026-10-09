import { useLocation } from 'react-router-dom'
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
  } = useShellEnvironment()

  return (
    <aside
      className={cn(
        'brand-font sticky top-0 z-30 flex h-screen w-full flex-col border-r border-border bg-card px-2 py-4',
        'max-[1100px]:px-1',
      )}
      aria-label="Primary navigation"
    >
      <SidebarLogo />
      <SidebarNavigation navigationSections={navigationSections} pathname={location.pathname} />

      <div className="mt-4 grid gap-2 border-t border-border pt-4">
        <SidebarAccount account={account} displayName={displayName} avatarImageUrl={avatarImageUrl} logout={logout} />
      </div>
    </aside>
  )
}
