import { apiClient } from '@/shared/lib/http/client'
import type { ApiEnvelope } from '@/shared/types/api'

export type FinalizedAvatarAsset = {
  id: string
  assetType: string
  status: string
  contentType: string
  sizeBytes: number
  expiresAtUtc?: string | null
  createdAtUtc: string
  updatedAtUtc: string
}

type PresignedAvatarUpload = {
  asset: FinalizedAvatarAsset
  uploadUrl: string
  expiresAtUtc: string
  method: string
}

export async function uploadAvatarAsset(file: File) {
  const presigned = await apiClient.post<ApiEnvelope<PresignedAvatarUpload>>('/assets/presign', {
    assetType: 'avatar', contentType: file.type, originalName: file.name, sizeBytes: file.size,
  })
  const target = presigned.data.data!
  const upload = await fetch(target.uploadUrl, { method: target.method ?? 'PUT', headers: { 'Content-Type': file.type }, body: file })
  if (!upload.ok) throw new Error('Avatar upload could not be completed.')
  const finalized = await apiClient.post<ApiEnvelope<FinalizedAvatarAsset>>('/assets/finalize', { assetId: target.asset.id })
  return finalized.data.data!
}
