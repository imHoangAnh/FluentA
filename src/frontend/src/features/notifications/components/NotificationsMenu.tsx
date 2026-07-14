import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useQuery } from '@tanstack/react-query'
import { Bell, Inbox, LoaderCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import { notificationApi } from '../api/notification.api'

type NotificationsMenuProps = {
  notificationsPath: string
  collapsed?: boolean
  active?: boolean
}

export function NotificationsMenu({ notificationsPath, collapsed = false, active = false }: NotificationsMenuProps) {
  const query = useQuery({ queryKey: ['notifications'], queryFn: notificationApi.list })
  const unreadCount = query.data?.filter((item) => !item.readAt).length ?? 0

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button
          type="button"
          variant="ghost"
          aria-label="Notifications"
          aria-describedby={unreadCount > 0 ? 'notification-unread-count' : undefined}
          className={cn(
            'h-10 w-full justify-start gap-3 px-3 text-sm font-medium text-muted-foreground hover:text-accent-foreground',
            active && 'bg-secondary text-secondary-foreground',
            collapsed && 'justify-center px-0',
            'max-[1100px]:justify-center max-[1100px]:px-0',
          )}
        >
          <span className="relative grid place-items-center">
            <Bell />
            {unreadCount > 0 ? <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground" aria-hidden="true">{unreadCount > 99 ? '99+' : unreadCount}</span> : null}
          </span>
          <span className={cn('truncate', collapsed && 'sr-only', 'max-[1100px]:sr-only')}>Notifications</span>
          {unreadCount > 0 ? <span id="notification-unread-count" className="sr-only">{unreadCount} unread notifications</span> : null}
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side="right"
          align="end"
          sideOffset={8}
          className="z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-[0_12px_36px_rgba(16,32,29,0.14)]"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <DropdownMenu.Label className="p-0 text-sm font-semibold">Notifications</DropdownMenu.Label>
            {unreadCount > 0 ? <span className="text-xs font-medium text-muted-foreground">{unreadCount} unread</span> : null}
          </div>
          <div className="max-h-[min(24rem,calc(100vh-11rem))] overflow-y-auto" aria-label="Recent notifications">
            {query.isLoading ? <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground" aria-busy="true"><LoaderCircle className="size-4 animate-spin" /> Loading notifications…</div> : null}
            {query.isError ? <p className="m-0 px-4 py-6 text-sm text-muted-foreground">Could not load notifications.</p> : null}
            {!query.isLoading && !query.isError && query.data?.length === 0 ? <div className="grid place-items-center gap-2 px-4 py-8 text-center text-sm text-muted-foreground"><Inbox className="size-5" /><p className="m-0">Your notification inbox is clear.</p></div> : null}
            {!query.isLoading && !query.isError && query.data?.length ? <ul className="m-0 divide-y divide-border p-0" aria-label="Recent notifications">{query.data.map((item) => {
              const unread = !item.readAt
              return <li key={item.id} className={cn('flex gap-3 px-4 py-3', unread && 'bg-primary/[0.035]')}><span className={cn('mt-1.5 size-2 shrink-0 rounded-full', unread ? 'bg-primary' : 'bg-transparent')} aria-hidden="true" /><span className="min-w-0"><strong className="block truncate text-sm font-medium text-foreground">{item.title}</strong><span className="mt-0.5 block text-sm text-muted-foreground">{item.message}</span></span></li>
            })}</ul> : null}
          </div>
          <DropdownMenu.Separator className="h-px bg-border" />
          <DropdownMenu.Item asChild>
            <Link to={notificationsPath} className="flex min-h-11 items-center justify-center px-4 text-sm font-medium text-primary outline-none transition-colors hover:bg-accent focus:bg-accent focus:text-accent-foreground">
              Show all notifications
            </Link>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
