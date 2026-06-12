import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck, LayoutDashboard } from 'lucide-react'
import { Link } from 'react-router-dom'
import { notificationApi } from '../../lib/api/notification.api'

export function NotificationsPage() {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['notifications'], queryFn: notificationApi.list })
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['notifications'] })
    void queryClient.invalidateQueries({ queryKey: ['notifications-unread'] })
  }
  const read = useMutation({ mutationFn: notificationApi.markRead, onSuccess: refresh })
  const readAll = useMutation({ mutationFn: notificationApi.markAllRead, onSuccess: refresh })

  return (
    <main className="workspace-shell">
      <header className="workspace-header">
        <div><span className="preview-label">Notifications</span><h1>Inbox</h1></div>
        <nav className="workspace-nav" aria-label="Notification navigation">
          <Link className="secondary-action" to="/"><LayoutDashboard size={17} /> Dashboard</Link>
          <button className="secondary-action" type="button" onClick={() => readAll.mutate()}><CheckCheck size={17} /> Mark all read</button>
        </nav>
      </header>
      <section className="dashboard-widget">
        {query.isLoading ? <p>Loading notifications...</p> : null}
        {query.data?.length === 0 ? <p>Your notification inbox is clear.</p> : null}
        {query.data?.map(item => (
          <button key={item.id} type="button" className="dashboard-list-row" onClick={() => !item.readAt && read.mutate(item.id)}>
            <Bell size={18} />
            <span><strong>{item.title}</strong><small>{item.message}</small></span>
            <small>{item.readAt ? 'Read' : 'Unread'}</small>
          </button>
        ))}
      </section>
    </main>
  )
}
