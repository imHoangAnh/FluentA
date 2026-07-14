import * as React from 'react'
import * as ContextMenuPrimitive from '@radix-ui/react-context-menu'
import { cn } from '@/shared/lib/utils'

const ContextMenu = ContextMenuPrimitive.Root
const ContextMenuTrigger = ContextMenuPrimitive.Trigger

function ContextMenuContent({ className, ...props }: React.ComponentProps<typeof ContextMenuPrimitive.Content>) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Content className={cn('z-50 min-w-40 rounded-md border border-border bg-card p-1 shadow-lg outline-none', className)} {...props} />
    </ContextMenuPrimitive.Portal>
  )
}

function ContextMenuItem({ className, ...props }: React.ComponentProps<typeof ContextMenuPrimitive.Item>) {
  return <ContextMenuPrimitive.Item className={cn('flex h-8 cursor-pointer select-none items-center rounded-sm px-2 text-sm font-medium outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground', className)} {...props} />
}

export { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger }
