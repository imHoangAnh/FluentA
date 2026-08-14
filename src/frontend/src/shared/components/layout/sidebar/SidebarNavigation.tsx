import { Link } from 'react-router-dom'
import { cn } from '@/shared/lib/utils'
import type { ShellNavigationItem, ShellNavigationSection } from '../ShellEnvironment'

type SidebarNavigationProps = {
  navigationSections: ShellNavigationSection[]
  pathname: string
}

function isNavigationItemActive(item: ShellNavigationItem, pathname: string) {
  if (item.isActive) return item.isActive(pathname)
  if (item.end) return pathname === item.to
  return pathname === item.to || pathname.startsWith(`${item.to}/`)
}

export function SidebarNavigation({ navigationSections, pathname }: SidebarNavigationProps) {
  return (
    <nav className="mt-6 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto" aria-label="Application">
      {navigationSections.map((section) => (
        <div className="grid gap-1" key={section.label}>
          <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground max-[1100px]:sr-only">{section.label}</p>
          {section.items.map((item) => {
            const Icon = item.icon
            const isActive = isNavigationItemActive(item, pathname)

            return (
              <Link
                key={item.to}
                to={item.to}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'group flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-accent-foreground',
                  isActive && 'bg-secondary text-secondary-foreground',
                  'max-[1100px]:justify-center max-[1100px]:px-0',
                )}
              >
                {Icon ? <Icon className="size-[18px]" aria-hidden="true" /> : null}
                <span className="truncate max-[1100px]:sr-only">{item.label}</span>
              </Link>
            )
          })}
        </div>
      ))}
    </nav>
  )
}
