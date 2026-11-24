import { Menu, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useShellEnvironment } from '../ShellEnvironment'
import { TopBarAccount } from './TopBarAccount'
import { TopBarLogo } from './TopBarLogo'
import { TopBarMobileDrawer } from './TopBarMobileDrawer'
import { TopBarNavigation } from './TopBarNavigation'

type OpenMenuState = {
  id: string
  pathname: string
} | null

export function AppTopBar() {
  const { pathname } = useLocation()
  const headerRef = useRef<HTMLElement>(null)
  const [openMenu, setOpenMenu] = useState<OpenMenuState>(null)
  const [mobileDrawerPathname, setMobileDrawerPathname] = useState<string | null>(null)

  const {
    account,
    displayName,
    avatarImageUrl,
    logout,
    navigationSections,
  } = useShellEnvironment()

  const activeMenuId = openMenu && openMenu.pathname === pathname ? openMenu.id : null
  const openSection = activeMenuId?.startsWith('nav:') ? activeMenuId.slice(4) : null
  const accountMenuOpen = activeMenuId === 'account'
  const mobileOpen = mobileDrawerPathname === pathname

  useEffect(() => {
    if (!activeMenuId && !mobileOpen) return

    function handlePointerDown(event: PointerEvent) {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setOpenMenu(null)
        setMobileDrawerPathname(null)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpenMenu(null)
        setMobileDrawerPathname(null)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [activeMenuId, mobileOpen])

  function closeAllMenus() {
    setOpenMenu(null)
    setMobileDrawerPathname(null)
  }

  function handleOpenSection(sectionLabel: string) {
    const targetId = `nav:${sectionLabel}`
    setMobileDrawerPathname(null)
    setOpenMenu({ id: targetId, pathname })
  }

  function handleCloseSection(sectionLabel: string) {
    const targetId = `nav:${sectionLabel}`
    setOpenMenu((prev) => (prev && prev.pathname === pathname && prev.id === targetId ? null : prev))
  }

  function handleToggleSection(sectionLabel: string) {
    const targetId = `nav:${sectionLabel}`
    setMobileDrawerPathname(null)
    setOpenMenu((prev) => (prev && prev.pathname === pathname && prev.id === targetId
      ? null
      : { id: targetId, pathname }))
  }

  function handleToggleAccount() {
    setMobileDrawerPathname(null)
    setOpenMenu((prev) => (prev && prev.pathname === pathname && prev.id === 'account'
      ? null
      : { id: 'account', pathname }))
  }

  function handleToggleMobile() {
    setOpenMenu(null)
    setMobileDrawerPathname((prev) => (prev === pathname ? null : pathname))
  }

  return (
    <header
      ref={headerRef}
      className="brand-font sticky top-0 z-40 h-16 w-full shrink-0 border-b border-border bg-card shadow-[var(--ds-shadow-xs)]"
      aria-label="Primary navigation"
    >
      <div className="mx-auto flex h-full w-full items-center justify-between gap-4 px-4 lg:px-6">
        <TopBarLogo />

        <TopBarNavigation
          navigationSections={navigationSections}
          pathname={pathname}
          openSection={openSection}
          onOpenSection={handleOpenSection}
          onCloseSection={handleCloseSection}
          onToggleSection={handleToggleSection}
          onCloseAll={closeAllMenus}
        />

        <div className="flex shrink-0 items-center justify-end gap-2 md:min-w-[140px] lg:min-w-[196px]">
          <TopBarAccount
            account={account}
            displayName={displayName}
            avatarImageUrl={avatarImageUrl}
            logout={logout}
            open={accountMenuOpen}
            onToggle={handleToggleAccount}
            onCloseAll={closeAllMenus}
          />

          <button
            type="button"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            aria-controls="topbar-mobile-drawer"
            onClick={handleToggleMobile}
            className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-muted/70 outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
          >
            {mobileOpen ? <X className="size-4" aria-hidden="true" /> : <Menu className="size-4" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <TopBarMobileDrawer
          navigationSections={navigationSections}
          pathname={pathname}
          account={account}
          displayName={displayName}
          logout={logout}
          onClose={closeAllMenus}
        />
      ) : null}
    </header>
  )
}
