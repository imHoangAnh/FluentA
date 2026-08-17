export type AssetType = 'avatar' | 'countdown-cover' | 'note-image'

export type Asset = {
  id: string
  assetType: string
  status: string
  contentType: string
  sizeBytes: number
  expiresAtUtc?: string | null
  createdAtUtc: string
  updatedAtUtc: string
}

export type PresignedAssetUpload = {
  asset: Asset
  uploadUrl: string
  expiresAtUtc: string
  method: string
}
