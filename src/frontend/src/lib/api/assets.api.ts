import type { ApiEnvelope } from './auth.api'
import { apiClient } from './client'

export type AssetPayload = {
  id: string
  assetType: string
  status: string
  publicUrl: string
  contentType: string
  sizeBytes: number
  expiresAtUtc?: string | null
  createdAtUtc: string
  updatedAtUtc: string
}

export type OwnedAssetPayload = AssetPayload & {
  isCurrentAvatar: boolean
}

type PresignedAssetUploadPayload = {
  asset: AssetPayload
  uploadUrl: string
  expiresAtUtc: string
  method: string
}

export async function listAssets(assetType = 'avatar') {
  const response = await apiClient.get<ApiEnvelope<OwnedAssetPayload[]>>('/assets', {
    params: {
      assetType,
    },
  })

  return response.data.data ?? []
}

export async function presignAvatarUpload(contentType: string) {
  const response = await apiClient.post<ApiEnvelope<PresignedAssetUploadPayload>>('/assets/presign', {
    assetType: 'avatar',
    contentType,
  })

  return response.data.data!
}

export async function finalizeAsset(assetId: string) {
  const response = await apiClient.post<ApiEnvelope<AssetPayload>>('/assets/finalize', { assetId })
  return response.data.data!
}

export async function deleteAsset(assetId: string) {
  await apiClient.delete(`/assets/${assetId}`)
}

export async function uploadAvatarAsset(file: File) {
  const presigned = await presignAvatarUpload(file.type)
  const upload = await fetch(presigned.uploadUrl, {
    method: presigned.method ?? 'PUT',
    headers: {
      'Content-Type': file.type,
    },
    body: file,
  })

  if (!upload.ok) {
    throw new Error('Avatar upload could not be completed.')
  }

  return finalizeAsset(presigned.asset.id)
}
