import type { ReactNode } from 'react'
import { AppShellMain } from './AppShellMain'
import { AppSidebar } from './sidebar/AppSidebar'

type AppShellProps = {
  children: ReactNode
  title: string
  description?: string
  contentClassName?: string
}

export function AppShell({ children, title, description, contentClassName }: AppShellProps) {
  return (
    <div className="ds-root flex min-h-screen bg-background">
      <AppSidebar />
      <AppShellMain title={title} description={description} contentClassName={contentClassName}>
        {children}
      </AppShellMain>
    </div>
  )
}
