import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck, CircleAlert, Inbox, LoaderCircle } from 'lucide-react'
import { AppShell } from '@/shared/components/layout/AppShell'
import { Alert } from '@/shared/components/ui/alert'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { cn } from '@/shared/lib/utils'
import { notificationApi } from '../api/notification.api'

export function NotificationsPage() {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['notifications'], queryFn: notificationApi.list })
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['notifications'] })
    void queryClient.invalidateQueries({ queryKey: ['notifications-unread'] })
  }
  const read = useMutation({ mutationFn: notificationApi.markRead, onSuccess: refresh })
  const readAll = useMutation({ mutationFn: notificationApi.markAllRead, onSuccess: refresh })
  const unreadCount = query.data?.filter((item) => !item.readAt).length ?? 0

  return (
    <AppShell
      title="Notifications"
      description="Keep up with reminders and completed countdowns."
      headerActions={
        <Button type="button" variant="outline" size="sm" disabled={unreadCount === 0 || readAll.isPending} onClick={() => readAll.mutate()}>
          <CheckCheck /> {readAll.isPending ? 'Marking read…' : 'Mark all read'}
        </Button>
      }
    >
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle>Inbox</CardTitle>
          <CardDescription>{unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}.` : 'Your inbox is up to date.'}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {query.isLoading ? <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground" aria-busy="true"><LoaderCircle className="size-4 animate-spin" /> Loading notifications…</div> : null}
          {query.isError ? <Alert className="m-5 border-destructive/30 bg-destructive/5 text-destructive"><CircleAlert className="mr-2 inline size-4" />Could not load notifications. Please retry.</Alert> : null}
          {!query.isLoading && !query.isError && query.data?.length === 0 ? <div className="grid place-items-center gap-2 p-12 text-center"><Inbox className="size-8 text-muted-foreground" /><p className="m-0 font-medium">Your notification inbox is clear.</p><p className="m-0 text-sm text-muted-foreground">New reminders and countdown updates will appear here.</p></div> : null}
          {!query.isLoading && !query.isError ? <ul className="m-0 divide-y divide-border p-0" aria-label="Notifications">{query.data?.map((item) => {
            const pending = read.isPending && read.variables === item.id
            const unread = !item.readAt
            return <li key={item.id}><button type="button" disabled={!unread || pending} className={cn('flex w-full items-start gap-3 p-5 text-left transition-colors hover:bg-accent disabled:cursor-default', unread && 'bg-primary/[0.035]')} onClick={() => unread && read.mutate(item.id)} aria-label={`${item.title}. ${unread ? pending ? 'Marking as read.' : 'Unread. Activate to mark as read.' : 'Read.'}`}><span className={cn('mt-0.5 grid size-8 shrink-0 place-items-center rounded-full', unread ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}><Bell className="size-4" /></span><span className="min-w-0 flex-1"><strong className="block text-sm text-foreground">{item.title}</strong><span className="mt-1 block text-sm text-muted-foreground">{item.message}</span></span><span className="shrink-0 text-xs font-medium text-muted-foreground">{pending ? 'Marking read…' : unread ? 'Unread' : 'Read'}</span></button></li>
          })}</ul> : null}
        </CardContent>
      </Card>
    </AppShell>
  )
}
