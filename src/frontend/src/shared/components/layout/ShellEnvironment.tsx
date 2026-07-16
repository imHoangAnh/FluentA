/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { getUserAvatarUrl } from '@/shared/lib/avatar'

export type ShellAccount = {
  email?: string | null
  fullName?: string | null
  avatarDownloadUrl?: string | null
}

export type ShellNavigationItem = {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  isActive?: (pathname: string) => boolean
}

export type ShellNavigationSection = {
  label: string
  items: ShellNavigationItem[]
}

export type ShellEnvironmentValue = {
  account: ShellAccount | null
  logout: () => Promise<void>
  navigationSections: ShellNavigationSection[]
  settingsNavigation: ShellNavigationItem
  notificationsPath: string
  notificationsMenu?: (collapsed: boolean, active: boolean) => ReactNode
}

const ShellEnvironmentContext = createContext<ShellEnvironmentValue | null>(null)

export function ShellEnvironmentProvider({ children, value }: { children: ReactNode, value: ShellEnvironmentValue }) {
  return <ShellEnvironmentContext.Provider value={value}>{children}</ShellEnvironmentContext.Provider>
}

export function useShellEnvironment() {
  const environment = useContext(ShellEnvironmentContext)
  if (!environment) {
    throw new Error('AppShell must be rendered inside ShellEnvironmentProvider.')
  }

  const displayName = environment.account?.fullName || environment.account?.email?.split('@')[0] || 'Learner'
  return {
    ...environment,
    displayName,
    avatarUrl: getUserAvatarUrl(environment.account, displayName),
  }
}
