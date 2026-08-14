import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/shared/api/client'
import { uploadAsset } from './assets.api'

const post = vi.spyOn(apiClient, 'post')
const fetchMock = vi.spyOn(globalThis, 'fetch')

afterAll(() => {
  post.mockRestore()
  fetchMock.mockRestore()
})

describe('asset upload capability', () => {
  beforeEach(() => {
    post.mockReset()
    fetchMock.mockReset().mockResolvedValue({ ok: true } as Response)
  })

  it.each([
    'avatar',
    'countdown-cover',
    'note-image',
  ] as const)('presigns, uploads, and finalizes a %s asset', async (assetType) => {
    const file = new File(['image'], 'cover.png', { type: 'image/png' })
    const asset = {
      id: 'asset-1',
      assetType,
      status: 'ready',
      contentType: file.type,
      sizeBytes: file.size,
      expiresAtUtc: null,
      createdAtUtc: '2026-08-14T00:00:00Z',
      updatedAtUtc: '2026-08-14T00:00:00Z',
    }
    post
      .mockResolvedValueOnce({ data: { data: { asset, uploadUrl: 'https://upload.example', expiresAtUtc: '2026-08-14T01:00:00Z', method: 'PUT' } } })
      .mockResolvedValueOnce({ data: { data: asset } })

    await expect(uploadAsset(file, assetType)).resolves.toEqual(asset)

    expect(post).toHaveBeenNthCalledWith(1, '/assets/presign', {
      assetType,
      contentType: 'image/png',
      originalName: 'cover.png',
      sizeBytes: file.size,
    })
    expect(fetchMock).toHaveBeenCalledWith('https://upload.example', {
      method: 'PUT',
      headers: { 'Content-Type': 'image/png' },
      body: file,
    })
    expect(post).toHaveBeenNthCalledWith(2, '/assets/finalize', { assetId: 'asset-1' })
  })

  it('keeps the asset-specific upload error when direct storage rejects the file', async () => {
    const file = new File(['image'], 'avatar.png', { type: 'image/png' })
    post.mockResolvedValueOnce({ data: { data: { asset: { id: 'asset-2' }, uploadUrl: 'https://upload.example', method: 'PUT' } } })
    fetchMock.mockResolvedValue({ ok: false } as Response)

    await expect(uploadAsset(file, 'avatar')).rejects.toThrow('Avatar upload could not be completed.')
    expect(post).toHaveBeenCalledTimes(1)
  })
})
