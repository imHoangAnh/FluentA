import { fireEvent, render, screen } from '@testing-library/react'
import { Home, Settings } from 'lucide-react'
import { createMemoryRouter, Link, MemoryRouter, RouterProvider, type RouteObject } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AppShellRouteLayout } from '@/app/layouts/AppShellRouteLayout'
import { protectedAppRoutes } from '@/app/router'
import { AppShell } from '@/shared/components/layout/AppShell'
import { appShellRoute, readAppShellRoute } from '@/shared/components/layout/app-shell-route'
import { ShellEnvironmentProvider } from '@/shared/components/layout/ShellEnvironment'

const shellEnvironment = {
  account: { fullName: 'Test Learner', email: 'learner@example.com' },
  logout: vi.fn(async () => undefined),
  navigationSections: [{ label: 'Main', items: [{ to: '/', label: 'Home', icon: Home, end: true }] }],
  settingsNavigation: { to: '/settings', label: 'Settings', icon: Settings },
  notificationsPath: '/notifications',
}

function routesWithoutShellMetadata(routes: RouteObject[], inherited = false, parent = 'protected'): string[] {
  return routes.flatMap((route, index) => {
    const routeName = route.path ?? (route.index ? 'index' : `layout-${index}`)
    const branchName = `${parent}/${routeName}`
    const hasMetadata = inherited || readAppShellRoute(route.handle) !== null

    if (route.children?.length) {
      return routesWithoutShellMetadata(route.children, hasMetadata, branchName)
    }

    return hasMetadata ? [] : [branchName]
  })
}

describe('AppShell environment', () => {
  it('uses injected navigation, home and profile links, account, and logout behavior', () => {
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
    expect(screen.getByRole('link', { name: 'Go to overview' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Open profile' })).toHaveAttribute('href', '/profile')
    expect(screen.getByText('Test Learner')).toBeInTheDocument()
    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Test page' })).toHaveClass('sr-only')

    const applicationLinks = screen.getAllByRole('link')
    expect(applicationLinks.indexOf(screen.getByRole('link', { name: 'Notifications' })))
      .toBeLessThan(applicationLinks.indexOf(screen.getByRole('link', { name: 'Settings' })))

    expect(screen.queryByRole('button', { name: /(?:Collapse|Expand) sidebar/ })).not.toBeInTheDocument()
    expect(screen.getByRole('tooltip')).toHaveTextContent('Log out')

    fireEvent.click(screen.getByRole('button', { name: 'Log out' }))
    expect(logout).toHaveBeenCalledTimes(1)
  })

  it('keeps the shell mounted while route metadata and content change', async () => {
    const router = createMemoryRouter([{
      element: <AppShellRouteLayout />,
      children: [
        {
          path: '/first',
          handle: appShellRoute({ title: 'First page' }),
          element: <Link to="/second">Go to second</Link>,
        },
        {
          path: '/second',
          handle: appShellRoute({ title: 'Second page', contentClassName: 'max-w-none' }),
          element: <p>Second route content</p>,
        },
      ],
    }], { initialEntries: ['/first'] })

    render(
      <ShellEnvironmentProvider value={shellEnvironment}>
        <RouterProvider router={router} />
      </ShellEnvironmentProvider>,
    )

    fireEvent.click(screen.getByRole('link', { name: 'Go to second' }))

    expect(await screen.findByText('Second route content')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to overview' })).toHaveAttribute('href', '/')
    expect(screen.queryByRole('button', { name: /(?:Collapse|Expand) sidebar/ })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Second page' })).toHaveClass('sr-only')
    expect(screen.getByRole('main')).toHaveClass('max-w-none')
  })

  it('requires AppShell metadata on every protected content branch', () => {
    expect(routesWithoutShellMetadata(protectedAppRoutes)).toEqual([])
  })
})
