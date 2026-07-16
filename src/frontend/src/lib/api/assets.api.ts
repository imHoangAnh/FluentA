import type { ApiEnvelope } from '@/shared/types/api'
import { apiClient } from '@/shared/lib/http/client'

export type AssetPayload = {
  id: string
  assetType: string
  status: string
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

type UploadFileMetadata = Pick<File, 'name' | 'size' | 'type'>

function presignRequest(assetType: string, file: UploadFileMetadata) {
  return {
    assetType,
    contentType: file.type,
    originalName: file.name,
    sizeBytes: file.size,
  }
}

export async function presignAvatarUpload(file: UploadFileMetadata) {
  const response = await apiClient.post<ApiEnvelope<PresignedAssetUploadPayload>>('/assets/presign', {
    ...presignRequest('avatar', file),
  })

  return response.data.data!
}

export async function presignCountdownCoverUpload(file: UploadFileMetadata) {
  const response = await apiClient.post<ApiEnvelope<PresignedAssetUploadPayload>>('/assets/presign', {
    ...presignRequest('countdown-cover', file),
  })

  return response.data.data!
}

export async function presignNoteImageUpload(file: UploadFileMetadata) {
  const response = await apiClient.post<ApiEnvelope<PresignedAssetUploadPayload>>('/assets/presign', {
    ...presignRequest('note-image', file),
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
  const presigned = await presignAvatarUpload(file)
  return uploadAssetFromPresign(file, presigned, 'Avatar upload could not be completed.')
}

export async function uploadCountdownCoverAsset(file: File) {
  const presigned = await presignCountdownCoverUpload(file)
  return uploadAssetFromPresign(file, presigned, 'Countdown cover upload could not be completed.')
}

export async function uploadNoteImageAsset(file: File) {
  const presigned = await presignNoteImageUpload(file)
  return uploadAssetFromPresign(file, presigned, 'Note image upload could not be completed.')
}

async function uploadAssetFromPresign(file: File, presigned: PresignedAssetUploadPayload, errorMessage: string) {
  const upload = await fetch(presigned.uploadUrl, {
    method: presigned.method ?? 'PUT',
    headers: {
      'Content-Type': file.type,
    },
    body: file,
  })

  if (!upload.ok) {
    throw new Error(errorMessage)
  }

  return finalizeAsset(presigned.asset.id)
}
