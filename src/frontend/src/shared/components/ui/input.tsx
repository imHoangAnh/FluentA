import * as React from 'react'
import { cn } from '@/shared/lib/utils'

function Input({ className, type, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn('flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground shadow-[var(--ds-shadow-xs)] transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50', className)}
      {...props}
    />
  )
}

export { Input }
