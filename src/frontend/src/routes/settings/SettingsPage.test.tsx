import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as assetsApi from '../../lib/api/assets.api'
import * as flashcardApi from '../../lib/api/flashcard.api'
import * as settingsApi from '../../lib/api/settings.api'
import { useAuthStore } from '../../stores/authStore'
import { SettingsPage } from './SettingsPage'

vi.mock('../../lib/api/assets.api', async () => {
  const actual = await vi.importActual<typeof import('../../lib/api/assets.api')>('../../lib/api/assets.api')
  return {
    ...actual,
    listAssets: vi.fn(),
    deleteAsset: vi.fn(),
    uploadAvatarAsset: vi.fn(),
  }
})

vi.mock('../../lib/api/flashcard.api', async () => {
  const actual = await vi.importActual<typeof import('../../lib/api/flashcard.api')>('../../lib/api/flashcard.api')
  return {
    ...actual,
    updatePracticeSettings: vi.fn(),
    updateReviewSettings: vi.fn(),
  }
})

vi.mock('../../lib/api/settings.api', async () => {
  const actual = await vi.importActual<typeof import('../../lib/api/settings.api')>('../../lib/api/settings.api')
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
      accessToken: 'memory-token',
      status: 'authenticated',
      error: null,
      user: {
        id: 'user-1',
        email: 'learner@example.com',
        fullName: 'FluentA Learner',
        isEmailVerified: true,
        bio: '',
        avatarUrl: null,
      },
    })

    vi.mocked(settingsApi.getSettings).mockResolvedValue({
      profile: {
        id: 'user-1',
        email: 'learner@example.com',
        fullName: 'FluentA Learner',
        isEmailVerified: true,
        bio: '',
        avatarUrl: null,
      },
      practiceSettings: {
        modeSequence: ['dictation', 'meaningToWord', 'pronunciation'],
      },
      reviewSettings: {
        dailyLimit: 300,
        recapAfterAnswer: true,
      },
    })
    vi.mocked(assetsApi.listAssets).mockResolvedValue([])
    vi.mocked(flashcardApi.updatePracticeSettings).mockResolvedValue({
      modeSequence: ['dictation', 'meaningToWord', 'pronunciation'],
    })
    vi.mocked(flashcardApi.updateReviewSettings).mockResolvedValue({
      dailyLimit: 300,
      recapAfterAnswer: true,
    })
  })

  it('reuses the finalized avatar asset on profile-save retry', async () => {
    const user = userEvent.setup()
    const avatarFile = new File(['avatar'], 'avatar.png', { type: 'image/png' })

    vi.mocked(assetsApi.uploadAvatarAsset).mockResolvedValue({
      id: 'asset-2',
      assetType: 'avatar',
      status: 'finalized',
      publicUrl: 'https://cdn.example.com/avatar-2.png',
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
        avatarUrl: 'https://cdn.example.com/avatar-2.png',
      })

    renderPage()

    expect(await screen.findByRole('heading', { name: 'Your settings' })).toBeInTheDocument()
    await user.upload(screen.getByLabelText(/choose avatar/i), avatarFile)
    await user.click(screen.getByRole('button', { name: 'Save profile' }))

    expect(await screen.findByText('Temporary profile save failure.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save profile' }))

    await waitFor(() => expect(screen.getByText('Profile saved.')).toBeInTheDocument())
    expect(assetsApi.uploadAvatarAsset).toHaveBeenCalledTimes(1)
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

  it('deletes the current saved avatar and clears cached profile state', async () => {
    const user = userEvent.setup()

    vi.mocked(assetsApi.listAssets).mockResolvedValue([{
      id: 'asset-current',
      assetType: 'avatar',
      status: 'finalized',
      publicUrl: 'https://cdn.example.com/current.png',
      contentType: 'image/png',
      sizeBytes: 2048,
      expiresAtUtc: null,
      createdAtUtc: '2026-07-03T00:00:00Z',
      updatedAtUtc: '2026-07-03T00:00:00Z',
      isCurrentAvatar: true,
    }])
    vi.mocked(assetsApi.deleteAsset).mockResolvedValue(undefined)

    renderPage()

    expect(await screen.findByText('Current avatar')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /delete/i }))

    await waitFor(() => expect(screen.getByText('Current avatar deleted.')).toBeInTheDocument())
    expect(assetsApi.deleteAsset).toHaveBeenCalledWith('asset-current')
    expect(useAuthStore.getState().user?.avatarUrl).toBeNull()
  })
})
