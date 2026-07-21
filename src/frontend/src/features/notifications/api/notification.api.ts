import { apiClient } from '@/shared/lib/http/client'

export type NotificationItem = {
  id: string
  type: string
  title: string
  message: string
  actionPath?: string | null
  readAt: string | null
  createdAt: string
}

export function safeNotificationActionPath(actionPath: string | null | undefined) {
  if (
    !actionPath
    || actionPath.length > 500
    || !actionPath.startsWith('/')
    || actionPath.startsWith('//')
    || actionPath.includes('\\')
    || [...actionPath].some((character) => character.charCodeAt(0) <= 31 || character.charCodeAt(0) === 127)
  ) return null

  try {
    const resolved = new URL(actionPath, window.location.origin)
    if (resolved.origin !== window.location.origin) return null
    return `${resolved.pathname}${resolved.search}${resolved.hash}`
  } catch {
    return null
  }
}

export const notificationApi = {
  list: async () => (await apiClient.get<{ data: NotificationItem[] }>('/notifications')).data.data,
  unreadCount: async () => (await apiClient.get<{ data: { count: number } }>('/notifications/unread-count')).data.data.count,
  markRead: async (id: string) => apiClient.patch(`/notifications/${id}/read`),
  markAllRead: async () => apiClient.patch('/notifications/read-all'),
}
