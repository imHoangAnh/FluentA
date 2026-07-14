import { fireEvent, render, screen } from '@testing-library/react'
import { Home, Settings } from 'lucide-react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AppShell } from '@/shared/components/layout/AppShell'
import { ShellEnvironmentProvider } from '@/shared/components/layout/ShellEnvironment'

describe('AppShell environment', () => {
  it('uses injected navigation, collapse state, account, and logout behavior', () => {
    const logout = vi.fn(async () => undefined)
    render(
      <MemoryRouter initialEntries={['/']}>
        <ShellEnvironmentProvider value={{
          account: { fullName: 'Test Learner', email: 'learner@example.com' },
          logout,
          navigationSections: [{ label: 'Main', items: [{ to: '/', label: 'Home', icon: Home, end: true }] }],
          settingsNavigation: { to: '/settings', label: 'Settings', icon: Settings },
          notificationsPath: '/notifications',
        }}>
          <AppShell title="Test page"><p>Content</p></AppShell>
        </ShellEnvironmentProvider>
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByText('Test Learner')).toBeInTheDocument()

    const collapse = screen.getByRole('button', { name: 'Collapse sidebar' })
    expect(collapse).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(collapse)
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(screen.getByRole('button', { name: 'Logout' }))
    expect(logout).toHaveBeenCalledTimes(1)
  })
})
