import { Link, useSearchParams } from 'react-router-dom'
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
  const [searchParams, setSearchParams] = useSearchParams()

  return (
    <>
      <nav className="mt-6 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto" aria-label="Application">
        {navigationSections.map((section) => (
          <div className="grid gap-1" key={section.label}>
            <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground max-[1100px]:sr-only">{section.label}</p>
            {section.items.map((item) => {
              const Icon = item.icon
              const dialogOpen = item.dialogQueryParam != null && searchParams.get(item.dialogQueryParam) === 'open'
              const isActive = isNavigationItemActive(item, pathname) || dialogOpen
              function setDialogOpen(open: boolean) {
                if (!item.dialogQueryParam || open === dialogOpen) return
                const nextSearchParams = new URLSearchParams(searchParams)
                if (open) nextSearchParams.set(item.dialogQueryParam, 'open')
                else if (nextSearchParams.get(item.dialogQueryParam) === 'open') nextSearchParams.delete(item.dialogQueryParam)
                setSearchParams(nextSearchParams, { replace: !open })
              }
              const className = cn(
                'group flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-accent-foreground',
                isActive && 'bg-secondary text-secondary-foreground',
                'max-[1100px]:justify-center max-[1100px]:px-0',
              )
              const content = <>{Icon ? <Icon className="size-[18px]" aria-hidden="true" /> : null}<span className="truncate max-[1100px]:sr-only">{item.label}</span></>

              return item.dialogQueryParam ? (
                <button
                  key={item.to}
                  type="button"
                  aria-label={item.label}
                  aria-haspopup="dialog"
                  aria-expanded={dialogOpen}
                  className={className}
                  onClick={() => setDialogOpen(true)}
                >
                  {content}
                </button>
              ) : (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                  className={className}
                >
                  {content}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>
      {navigationSections.flatMap((section) => section.items).map((item) => item.renderDialog?.(
        item.dialogQueryParam != null && searchParams.get(item.dialogQueryParam) === 'open',
        (open) => {
          if (!item.dialogQueryParam) return
          const isOpen = searchParams.get(item.dialogQueryParam) === 'open'
          if (open === isOpen) return
          const nextSearchParams = new URLSearchParams(searchParams)
          if (open) nextSearchParams.set(item.dialogQueryParam, 'open')
          else if (nextSearchParams.get(item.dialogQueryParam) === 'open') nextSearchParams.delete(item.dialogQueryParam)
          setSearchParams(nextSearchParams, { replace: !open })
        },
      ))}
    </>
  )
}
