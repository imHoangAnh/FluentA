import type { ReactNode } from 'react'
import { AppShellMain } from './AppShellMain'
import { AppTopBar } from './topbar/AppTopBar'

type AppShellProps = {
  children: ReactNode
  title: string
  description?: string
  contentClassName?: string
}

export function AppShell({ children, title, description, contentClassName }: AppShellProps) {
  return (
    <div className="ds-root flex min-h-screen flex-col bg-background">
      <AppTopBar />
      <AppShellMain title={title} description={description} contentClassName={contentClassName}>
        {children}
      </AppShellMain>
    </div>
  )
}
