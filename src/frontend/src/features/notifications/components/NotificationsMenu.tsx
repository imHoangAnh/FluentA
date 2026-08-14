import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, Inbox, LoaderCircle } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/shared/components/ui/button'
import { dropdownContentClassName, dropdownItemClassName, dropdownSeparatorClassName } from '@/shared/components/ui/dropdown-styles'
import { cn } from '@/shared/lib/utils'
import { notificationApi, safeNotificationActionPath, type NotificationItem } from '../api/notification.api'
import { notificationKeys } from '../api/notification.queries'

type NotificationsMenuProps = {
  notificationsPath: string
  active?: boolean
}

export function NotificationsMenu({ notificationsPath, active = false }: NotificationsMenuProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: notificationKeys.all, queryFn: notificationApi.list })
  const unreadCount = query.data?.filter((item) => !item.readAt).length ?? 0

  async function activate(item: NotificationItem) {
    try {
      if (!item.readAt) {
        await notificationApi.markRead(item.id)
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
          queryClient.invalidateQueries({ queryKey: notificationKeys.unread }),
        ])
      }

      const actionPath = safeNotificationActionPath(item.actionPath)
      if (actionPath) navigate(actionPath)
    } catch {
      return
    }
  }

  return (
    <Menu as="div" className="relative">
        <MenuButton
          as={Button}
          type="button"
          variant="ghost"
          aria-label="Notifications"
          aria-describedby={unreadCount > 0 ? 'notification-unread-count' : undefined}
          className={cn(
            'h-10 w-full justify-start gap-3 px-3 text-sm font-medium text-muted-foreground hover:text-accent-foreground',
            active && 'bg-secondary text-secondary-foreground',
            'max-[1100px]:justify-center max-[1100px]:px-0',
          )}
        >
          <span className="relative grid place-items-center">
            <Bell />
            {unreadCount > 0 ? <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground" aria-hidden="true">{unreadCount > 99 ? '99+' : unreadCount}</span> : null}
          </span>
          <span className="truncate max-[1100px]:sr-only">Notifications</span>
          {unreadCount > 0 ? <span id="notification-unread-count" className="sr-only">{unreadCount} unread notifications</span> : null}
        </MenuButton>
      <MenuItems
        anchor={{ to: 'right end', gap: '8px' }}
        transition
        className={cn(dropdownContentClassName, 'flex w-[min(24rem,calc(100vw-2rem))] min-w-0 flex-col p-0')}
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="p-0 text-sm font-semibold">Notifications</div>
            {unreadCount > 0 ? <span className="text-xs font-medium text-muted-foreground">{unreadCount} unread</span> : null}
          </div>
          <div className="max-h-[min(24rem,calc(100vh-11rem))] overflow-y-auto" aria-label="Recent notifications">
            {query.isLoading ? <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground" aria-busy="true"><LoaderCircle className="size-4 animate-spin" /> Loading notifications…</div> : null}
            {query.isError ? <p className="m-0 px-4 py-6 text-sm text-muted-foreground">Could not load notifications.</p> : null}
            {!query.isLoading && !query.isError && query.data?.length === 0 ? <div className="grid place-items-center gap-2 px-4 py-8 text-center text-sm text-muted-foreground"><Inbox className="size-5" /><p className="m-0">Your notification inbox is clear.</p></div> : null}
            {!query.isLoading && !query.isError && query.data?.length ? <ul className="m-0 divide-y divide-border p-0" aria-label="Recent notifications">{query.data.map((item) => {
              const unread = !item.readAt
              return <li key={item.id}><MenuItem as="button" type="button" className={cn(dropdownItemClassName, 'h-auto w-full items-start rounded-none px-4 py-3 font-normal', unread && 'bg-primary/[0.035]')} onClick={() => void activate(item)}><span className={cn('mt-1.5 size-2 shrink-0 rounded-full', unread ? 'bg-primary' : 'bg-transparent')} aria-hidden="true" /><span className="min-w-0"><strong className="block truncate text-sm font-medium text-foreground">{item.title}</strong><span className="mt-0.5 block text-sm text-muted-foreground">{item.message}</span></span></MenuItem></li>
            })}</ul> : null}
          </div>
          <div className={cn(dropdownSeparatorClassName, 'm-0')} role="separator" />
          <MenuItem as={Link} to={notificationsPath} className={cn(dropdownItemClassName, 'min-h-11 justify-center rounded-none px-4 text-primary data-focus:text-primary')}>
              Show all notifications
          </MenuItem>
      </MenuItems>
    </Menu>
  )
}
