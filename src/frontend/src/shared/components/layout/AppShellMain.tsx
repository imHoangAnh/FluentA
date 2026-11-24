import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'

type AppShellMainProps = {
  children: ReactNode
  title: string
  description?: string
  contentClassName?: string
}

export function AppShellMain({ children, title, description, contentClassName }: AppShellMainProps) {
  const resolvedContentClassName = contentClassName?.replace(/\bh-screen\b/g, 'h-[calc(100vh-4rem)]')

  return (
    <div className="min-w-0 flex-1">
      <main
        id="main-content"
        className={cn('w-full max-w-none min-h-[calc(100vh-4rem)] px-4 py-4 lg:px-6 lg:py-5', resolvedContentClassName)}
      >
        <h1 className="sr-only">{title}</h1>
        {description ? <p className="sr-only">{description}</p> : null}
        {children}
      </main>
    </div>
  )
}
