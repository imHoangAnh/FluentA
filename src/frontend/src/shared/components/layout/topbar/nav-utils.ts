import type { ShellNavigationItem, ShellNavigationSection } from '../ShellEnvironment'

export function isNavigationItemActive(item: ShellNavigationItem, pathname: string): boolean {
  if (item.isActive) return item.isActive(pathname)
  if (item.end) return pathname === item.to
  return pathname === item.to || pathname.startsWith(`${item.to}/`)
}

export function isSectionActive(
  section: ShellNavigationSection,
  pathname: string,
  searchParams: URLSearchParams,
): boolean {
  return section.items.some((item) => {
    const dialogOpen = item.dialogQueryParam != null && searchParams.get(item.dialogQueryParam) === 'open'
    return isNavigationItemActive(item, pathname) || dialogOpen
  })
}
