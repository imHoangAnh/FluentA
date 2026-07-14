import { apiClient } from '@/shared/lib/http/client'
import type { ApiEnvelope } from '@/shared/types/api'

export type OwnedAvatarAsset = {
  id: string
  assetType: string
  status: string
  publicUrl: string
  contentType: string
  sizeBytes: number
  expiresAtUtc?: string | null
  createdAtUtc: string
  updatedAtUtc: string
  isCurrentAvatar: boolean
}

type PresignedAvatarUpload = {
  asset: OwnedAvatarAsset
  uploadUrl: string
  expiresAtUtc: string
  method: string
}

export async function listAvatarAssets() {
  const response = await apiClient.get<ApiEnvelope<OwnedAvatarAsset[]>>('/assets', { params: { assetType: 'avatar' } })
  return response.data.data ?? []
}

export async function deleteAvatarAsset(assetId: string) {
  await apiClient.delete(`/assets/${assetId}`)
}

export async function uploadAvatarAsset(file: File) {
  const presigned = await apiClient.post<ApiEnvelope<PresignedAvatarUpload>>('/assets/presign', {
    assetType: 'avatar', contentType: file.type,
  })
  const target = presigned.data.data!
  const upload = await fetch(target.uploadUrl, { method: target.method ?? 'PUT', headers: { 'Content-Type': file.type }, body: file })
  if (!upload.ok) throw new Error('Avatar upload could not be completed.')
  const finalized = await apiClient.post<ApiEnvelope<OwnedAvatarAsset>>('/assets/finalize', { assetId: target.asset.id })
  return finalized.data.data!
}
