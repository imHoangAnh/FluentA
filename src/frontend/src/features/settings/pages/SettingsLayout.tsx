import { NavLink, Outlet } from 'react-router-dom'
import { AppShell } from '@/shared/components/layout/AppShell'
import { Card } from '@/shared/components/ui/card'
import { cn } from '@/shared/lib/utils'

const settingsLinks = [
  { to: '/settings/profile', label: 'Profile' },
  { to: '/settings/review', label: 'Review' },
  { to: '/settings/practice', label: 'Practice' },
  { to: '/settings/level5', label: 'Level 5' },
]

export function SettingsLayout() {
  return (
    <AppShell title="Settings" description="Manage your profile and learning preferences.">
      <div className="grid items-start gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <Card className="p-3">
          <nav className="grid gap-1" aria-label="Settings navigation">
            {settingsLinks.map((link) => <NavLink key={link.to} to={link.to} className={({ isActive }) => cn('rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground', isActive && 'bg-secondary text-secondary-foreground')}>{link.label}</NavLink>)}
          </nav>
        </Card>
        <section className="min-w-0"><Outlet /></section>
      </div>
    </AppShell>
  )
}
