import { LogOut } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'

const settingsLinks = [
  { to: '/settings/profile', label: 'Profile' },
  { to: '/settings/review', label: 'Review' },
  { to: '/settings/practice', label: 'Practice' },
  { to: '/settings/level5', label: 'Level 5' },
]

export function SettingsLayout() {
  const logout = useAuthStore((state) => state.logout)

  return (
    <main className="workspace settings-shell">
      <header className="workspace-header settings-shell__header">
        <div className="brand-inline">
          <span className="brand-mark brand-mark--small">FA</span>
          <strong>FluentA</strong>
        </div>
        <nav className="workspace-nav" aria-label="Settings workspace actions">
          <NavLink className="ghost-button ghost-button--inline" to="/flashcards">Flashcards</NavLink>
          <button className="icon-button" type="button" onClick={() => void logout()} aria-label="Logout">
            <LogOut size={18} />
          </button>
        </nav>
      </header>

      <div className="settings-shell__body">
        <aside className="settings-sidebar" aria-label="Settings sections">
          <div className="settings-sidebar__copy">
            <span className="preview-label">Settings</span>
            <h1>Your settings</h1>
            <p>Move between profile, review, practice, and Level 5 management from one shared desktop workspace.</p>
          </div>
          <nav className="settings-sidebar__nav" aria-label="Settings navigation">
            {settingsLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => isActive
                  ? 'settings-sidebar__link settings-sidebar__link--active'
                  : 'settings-sidebar__link'}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <section className="settings-shell__content">
          <Outlet />
        </section>
      </div>
    </main>
  )
}
