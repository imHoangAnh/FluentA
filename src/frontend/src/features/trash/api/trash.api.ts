import { apiClient } from '@/shared/api/client'
import type { ApiEnvelope } from '@/shared/api/contracts'
import type { TrashEntry } from '@/shared/api/deletion.contracts'
import { APP_TIME_ZONE } from '@/shared/lib/timezone'

export async function listTrash(type?: string, query?: string) {
  const response = await apiClient.get<ApiEnvelope<{ items: TrashEntry[] }>>('/trash', { params: { type, query, limit: 50 } })
  return response.data.data?.items ?? []
}

export async function restoreTrashEntry(id: string) {
  await apiClient.post(`/trash/${id}/restore`, { timeZoneId: APP_TIME_ZONE })
}

export async function permanentlyDeleteTrashEntry(id: string) {
  await apiClient.delete(`/trash/${id}`)
}

export async function bulkRestoreTrashEntries(ids: string[]) {
  await apiClient.post('/trash/bulk-restore', { entryIds: ids, timeZoneId: APP_TIME_ZONE })
}

export async function bulkPermanentlyDeleteTrashEntries(ids: string[]) {
  await apiClient.post('/trash/bulk-delete', { entryIds: ids })
}

export async function emptyTrash() {
  await apiClient.delete('/trash')
}
