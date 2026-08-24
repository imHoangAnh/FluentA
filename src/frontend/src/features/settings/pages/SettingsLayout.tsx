import { Headphones, Trophy } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { Card } from '@/shared/components/ui/card'
import { cn } from '@/shared/lib/utils'

const settingsLinks = [
  { to: '/settings/practice', label: 'Practice', icon: Headphones },
  { to: '/settings/level5', label: 'Level 5', icon: Trophy },
]

export function SettingsLayout() {
  return (
    <div className="grid h-full min-h-0 min-w-0 items-start gap-4 min-[900px]:grid-cols-[minmax(0,1fr)_minmax(0,5fr)]">
      <Card className="p-2 min-[900px]:sticky min-[900px]:top-0">
        <nav className="grid grid-cols-1 gap-1 min-[400px]:grid-cols-2 min-[900px]:grid-cols-1" aria-label="Settings navigation">
          {settingsLinks.map(({ icon: Icon, label, to }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => cn(
                'flex min-w-0 items-center gap-2 rounded-md px-2.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground sm:px-3 sm:text-sm',
                isActive && 'bg-secondary text-secondary-foreground',
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
        </nav>
      </Card>
      <section className="h-full min-h-0 min-w-0 overflow-y-auto"><Outlet /></section>
    </div>
  )
}
