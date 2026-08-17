import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as assetsApi from '@/features/assets'
import * as settingsApi from '@/features/settings/api/settings.api'
import { useAuthStore } from '@/features/auth'
import { SettingsPage } from '@/features/settings/pages/SettingsPage'

vi.mock('@/features/assets', async () => {
  const actual = await vi.importActual<typeof import('@/features/assets')>('@/features/assets')
  return {
    ...actual,
    uploadAsset: vi.fn(),
  }
})

vi.mock('@/features/settings/api/settings.api', async () => {
  const actual = await vi.importActual<typeof import('@/features/settings/api/settings.api')>('@/features/settings/api/settings.api')
  return {
    ...actual,
    getSettings: vi.fn(),
    updateProfile: vi.fn(),
  }
})

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('SettingsPage profile save', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({
      status: 'authenticated',
      error: null,
      user: {
        id: 'user-1',
        email: 'learner@example.com',
        fullName: 'FluentA Learner',
        isEmailVerified: true,
        bio: '',
      },
    })

    vi.mocked(settingsApi.getSettings).mockResolvedValue({
      profile: {
        id: 'user-1',
        email: 'learner@example.com',
        fullName: 'FluentA Learner',
        isEmailVerified: true,
        bio: '',
      },
      practiceSettings: {
        modeSequence: ['dictation', 'meaningToWord', 'pronunciation'],
      },
    })
  })

  it('reuses the finalized avatar asset on profile-save retry', async () => {
    const user = userEvent.setup()
    const avatarFile = new File(['avatar'], 'avatar.png', { type: 'image/png' })

    vi.mocked(assetsApi.uploadAsset).mockResolvedValue({
      id: 'asset-2',
      assetType: 'avatar',
      status: 'ready',
      contentType: 'image/png',
      sizeBytes: 6,
      expiresAtUtc: null,
      createdAtUtc: '2026-07-03T00:00:00Z',
      updatedAtUtc: '2026-07-03T00:00:00Z',
    })
    vi.mocked(settingsApi.updateProfile)
      .mockRejectedValueOnce(new Error('Temporary profile save failure.'))
      .mockResolvedValueOnce({
        id: 'user-1',
        email: 'learner@example.com',
        fullName: 'FluentA Learner',
        isEmailVerified: true,
        bio: '',
        avatarAssetId: 'asset-2',
        avatarDownloadUrl: 'https://signed.example.com/avatar-2.png',
      })

    renderPage()

    expect(await screen.findByRole('heading', { name: 'Profile' })).toBeInTheDocument()
    expect(screen.getByLabelText('Full name')).toHaveValue('FluentA Learner')
    expect(screen.getByLabelText('Email')).toHaveValue('learner@example.com')
    expect(screen.getByLabelText('About')).toBeInTheDocument()
    expect(screen.queryByLabelText('Username')).not.toBeInTheDocument()
    await user.upload(screen.getByLabelText(/choose avatar/i), avatarFile)
    await user.click(screen.getByRole('button', { name: 'Save profile' }))

    expect(await screen.findByText('Temporary profile save failure.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save profile' }))

    await waitFor(() => expect(screen.getByText('Profile saved.')).toBeInTheDocument())
    expect(assetsApi.uploadAsset).toHaveBeenCalledTimes(1)
    expect(assetsApi.uploadAsset).toHaveBeenCalledWith(avatarFile, 'avatar')
    expect(settingsApi.updateProfile).toHaveBeenNthCalledWith(1, {
      fullName: 'FluentA Learner',
      bio: '',
      removeAvatar: false,
      avatarAssetId: 'asset-2',
    })
    expect(settingsApi.updateProfile).toHaveBeenNthCalledWith(2, {
      fullName: 'FluentA Learner',
      bio: '',
      removeAvatar: false,
      avatarAssetId: 'asset-2',
    })
  })

})
