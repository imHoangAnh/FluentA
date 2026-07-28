import { apiClient } from '@/shared/lib/http/client'
import type { ApiEnvelope } from '@/shared/types/api'

export type TrashEntry = {
  id: string
  entityKind: string
  entityId: string
  displayName: string
  originalLocation: string
  trashedAt: string
  purgeAfterAt: string
}

export async function listTrash(type?: string, query?: string) {
  const response = await apiClient.get<ApiEnvelope<{ items: TrashEntry[] }>>('/trash', { params: { type, query, limit: 50 } })
  return response.data.data?.items ?? []
}

export async function restoreTrashEntry(id: string) {
  const timeZoneId = Intl.DateTimeFormat().resolvedOptions().timeZone
  await apiClient.post(`/trash/${id}/restore`, { timeZoneId })
}

export async function permanentlyDeleteTrashEntry(id: string) {
  await apiClient.delete(`/trash/${id}`)
}

export async function bulkRestoreTrashEntries(ids: string[]) {
  const timeZoneId = Intl.DateTimeFormat().resolvedOptions().timeZone
  await apiClient.post('/trash/bulk-restore', { entryIds: ids, timeZoneId })
}

export async function bulkPermanentlyDeleteTrashEntries(ids: string[]) {
  await apiClient.post('/trash/bulk-delete', { entryIds: ids })
}

export async function emptyTrash() {
  await apiClient.delete('/trash')
}
