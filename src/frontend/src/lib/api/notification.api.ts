import { apiClient } from '@/shared/lib/http/client'

export type NotificationItem = {
  id: string
  type: string
  title: string
  message: string
  readAt: string | null
  createdAt: string
}

export const notificationApi = {
  list: async () => (await apiClient.get<{ data: NotificationItem[] }>('/notifications')).data.data,
  unreadCount: async () => (await apiClient.get<{ data: { count: number } }>('/notifications/unread-count')).data.data.count,
  markRead: async (id: string) => apiClient.patch(`/notifications/${id}/read`),
  markAllRead: async () => apiClient.patch('/notifications/read-all'),
}
