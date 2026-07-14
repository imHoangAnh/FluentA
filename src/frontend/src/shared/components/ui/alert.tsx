import * as React from 'react'
import { cn } from '@/shared/lib/utils'

function Alert({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div role="alert" className={cn('rounded-md border border-border bg-muted/45 px-4 py-3 text-sm text-foreground', className)} {...props} />
}

export { Alert }
