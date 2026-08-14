import { apiClient } from '@/shared/api/client'
import type { ApiEnvelope } from '@/shared/api/contracts'
import type { Asset, AssetType, PresignedAssetUpload } from './assets.contracts'

const uploadErrorMessages: Record<AssetType, string> = {
  avatar: 'Avatar upload could not be completed.',
  'countdown-cover': 'Countdown cover upload could not be completed.',
  'note-image': 'Note image upload could not be completed.',
}

export async function uploadAsset(file: File, assetType: AssetType) {
  const presigned = await apiClient.post<ApiEnvelope<PresignedAssetUpload>>('/assets/presign', {
    assetType,
    contentType: file.type,
    originalName: file.name,
    sizeBytes: file.size,
  })
  const target = presigned.data.data!
  const upload = await fetch(target.uploadUrl, {
    method: target.method ?? 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  })

  if (!upload.ok) {
    throw new Error(uploadErrorMessages[assetType])
  }

  const finalized = await apiClient.post<ApiEnvelope<Asset>>('/assets/finalize', {
    assetId: target.asset.id,
  })
  return finalized.data.data!
}
