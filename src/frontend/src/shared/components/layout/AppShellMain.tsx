import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'

type AppShellMainProps = {
  children: ReactNode
  title: string
  description?: string
  contentClassName?: string
}

export function AppShellMain({ children, title, description, contentClassName }: AppShellMainProps) {
  return (
    <div className="min-w-0 flex-1">
      <main id="main-content" className={cn('w-full max-w-none min-h-screen p-3 lg:p-4', contentClassName)}>
        <h1 className="sr-only">{title}</h1>
        {description ? <p className="sr-only">{description}</p> : null}
        {children}
      </main>
    </div>
  )
}
