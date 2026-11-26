import { ChevronDown } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { cn } from '@/shared/lib/utils'
import type { ShellNavigationItem, ShellNavigationSection } from '../ShellEnvironment'
import { isNavigationItemActive } from './nav-utils'

type TopBarNavigationProps = {
  navigationSections: ShellNavigationSection[]
  pathname: string
  openSection: string | null
  onOpenSection: (sectionLabel: string) => void
  onCloseSection: (sectionLabel: string) => void
  onToggleSection: (sectionLabel: string) => void
  onCloseAll: () => void
}

export function TopBarNavigation({
  navigationSections,
  pathname,
  openSection,
  onOpenSection,
  onCloseSection,
  onToggleSection,
  onCloseAll,
}: TopBarNavigationProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const isHomeActive = pathname === '/'

  function setItemDialogOpen(item: ShellNavigationItem, open: boolean) {
    if (!item.dialogQueryParam) return
    const isCurrentlyOpen = searchParams.get(item.dialogQueryParam) === 'open'
    if (open === isCurrentlyOpen) return
    const nextSearchParams = new URLSearchParams(searchParams)
    if (open) nextSearchParams.set(item.dialogQueryParam, 'open')
    else if (nextSearchParams.get(item.dialogQueryParam) === 'open') nextSearchParams.delete(item.dialogQueryParam)
    setSearchParams(nextSearchParams, { replace: !open })
  }

  return (
    <>
      <nav className="hidden items-center gap-1.5 md:flex" aria-label="Application">
        <Link
          to="/"
          aria-current={isHomeActive ? 'page' : undefined}
          onClick={onCloseAll}
          className={cn(
            'group inline-flex h-9 items-center rounded-lg px-3.5 text-sm font-semibold text-foreground/80 underline-offset-4 transition-colors duration-150 hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            !isHomeActive && 'hover:underline',
          )}
        >
          <span>Home</span>
        </Link>

        {navigationSections.map((section) => {
          const isOpen = openSection === section.label
          const menuId = `topbar-menu-${section.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

          return (
            <div
              key={section.label}
              className="relative"
              onMouseEnter={() => onOpenSection(section.label)}
              onMouseLeave={() => onCloseSection(section.label)}
            >
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={menuId}
                onClick={() => onToggleSection(section.label)}
                className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg px-3.5 text-sm font-semibold text-foreground/80 transition-colors duration-150 hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <span>{section.label}</span>
                <ChevronDown
                  aria-hidden="true"
                  className={cn(
                    'size-3.5 text-muted-foreground transition-transform duration-150',
                    isOpen && 'rotate-180',
                  )}
                />
              </button>

              {isOpen ? (
                <div
                  id={menuId}
                  className="absolute left-0 top-full z-50 min-w-[170px] pt-2"
                >
                  <div className="rounded-xl border border-border bg-card px-2 py-2 shadow-[var(--ds-shadow-lg)]">
                    <div className="grid gap-0.5">
                      {section.items.map((item) => {
                        const dialogOpen = item.dialogQueryParam != null && searchParams.get(item.dialogQueryParam) === 'open'
                        const itemActive = isNavigationItemActive(item, pathname) || dialogOpen

                        const rowClassName = cn(
                          'group block w-full cursor-pointer rounded-md px-2.5 py-1.5 text-left text-sm font-normal text-foreground underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          !itemActive && 'hover:underline',
                        )

                        const innerContent = (
                          <span
                            className={cn(
                              'inline-block whitespace-nowrap underline-offset-4',
                              !itemActive && 'group-hover:underline',
                            )}
                          >
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
                              onCloseAll()
                              setItemDialogOpen(item, true)
                            }}
                          >
                            {innerContent}
                          </button>
                        ) : (
                          <Link
                            key={item.to}
                            to={item.to}
                            aria-label={item.label}
                            aria-current={itemActive ? 'page' : undefined}
                            className={rowClassName}
                            onClick={onCloseAll}
                          >
                            {innerContent}
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )
        })}
      </nav>

      {navigationSections
        .flatMap((section) => section.items)
        .map((item) => item.renderDialog?.(
          item.dialogQueryParam != null && searchParams.get(item.dialogQueryParam) === 'open',
          (open) => setItemDialogOpen(item, open),
        ))}
    </>
  )
}
