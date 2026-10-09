import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as assetsApi from '@/features/assets'
import * as profileApi from '@/features/profile/api/profile.api'
import { useAuthStore } from '@/features/auth'
import { ProfilePage } from '@/features/profile/pages/ProfilePage'

vi.mock('@/features/assets', async () => {
  const actual = await vi.importActual<typeof import('@/features/assets')>('@/features/assets')
  return {
    ...actual,
    uploadAsset: vi.fn(),
  }
})

vi.mock('@/features/profile/api/profile.api', async () => {
  const actual = await vi.importActual<typeof import('@/features/profile/api/profile.api')>('@/features/profile/api/profile.api')
  return {
    ...actual,
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
    linkGoogle: vi.fn(),
  }
})

vi.mock('@/features/auth/components/GoogleSignInButton', () => ({
  GoogleSignInButton: ({ onCredential, disabled, label }: {
    onCredential: (idToken: string) => Promise<void>
    disabled: boolean
    label: string
  }) => <button type="button" disabled={disabled} onClick={() => { void onCredential('google-id-token') }}>{label}</button>,
}))

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
        <ProfilePage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ProfilePage profile save', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({
      status: 'authenticated',
      error: null,
      user: {
        id: 'user-1',
        fullName: 'FluentA Learner',
        avatarUrl: null,
      },
    })

    vi.mocked(profileApi.getProfile).mockResolvedValue({
        id: 'user-1',
        email: 'learner@example.com',
        fullName: 'FluentA Learner',
        isEmailVerified: true,
        isGoogleLinked: false,
        avatarAssetId: null,
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
    vi.mocked(profileApi.updateProfile)
      .mockRejectedValueOnce(new Error('Temporary profile save failure.'))
      .mockResolvedValueOnce({
        id: 'user-1',
        email: 'learner@example.com',
        fullName: 'FluentA Learner',
        isEmailVerified: true,
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
    expect(profileApi.updateProfile).toHaveBeenNthCalledWith(1, {
      fullName: 'FluentA Learner',
      bio: '',
      removeAvatar: false,
      avatarAssetId: 'asset-2',
    })
    expect(profileApi.updateProfile).toHaveBeenNthCalledWith(2, {
      fullName: 'FluentA Learner',
      bio: '',
      removeAvatar: false,
      avatarAssetId: 'asset-2',
    })
  })

  it('links Google only after the current password is supplied', async () => {
    const user = userEvent.setup()
    vi.mocked(profileApi.linkGoogle).mockResolvedValue({
      id: 'user-1',
      email: 'learner@example.com',
      fullName: 'FluentA Learner',
      isEmailVerified: true,
      isGoogleLinked: true,
    })

    renderPage()
    const linkButton = await screen.findByRole('button', { name: 'Link Google account' })
    expect(linkButton).toBeDisabled()
    await user.type(screen.getByLabelText('Current password'), 'current-password')
    await user.click(linkButton)

    await waitFor(() => expect(vi.mocked(profileApi.linkGoogle).mock.calls[0]?.[0]).toEqual({
      idToken: 'google-id-token',
      currentPassword: 'current-password',
    }))
    expect(await screen.findByText('Your Google account is linked.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Current password')).not.toBeInTheDocument()
  })

})
