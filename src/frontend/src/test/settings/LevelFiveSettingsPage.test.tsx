import { render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as reviewApi from '@/features/review'
import { LevelFiveSettingsPage } from '@/features/settings/pages/LevelFiveSettingsPage'

vi.mock('@/features/review', async () => {
  const actual = await vi.importActual<typeof import('@/features/review')>('@/features/review')
  return {
    ...actual,
    listLevelFiveWords: vi.fn(),
    removeLevelFiveWords: vi.fn(),
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
        <LevelFiveSettingsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const levelFiveItems: reviewApi.LevelFiveReviewItem[] = [
  {
    wordId: 'word-1',
    word: 'alpha',
    boardId: 'board-1',
    boardName: 'Board A',
    pageId: 'page-1',
    pageName: 'Page A',
    status: 'active',
    lastReviewDate: '2026-07-08T00:00:00Z',
  },
  {
    wordId: 'word-2',
    word: 'beta',
    boardId: 'board-1',
    boardName: 'Board A',
    pageId: 'page-2',
    pageName: 'Page B',
    status: 'active',
    lastReviewDate: '2026-07-07T00:00:00Z',
  },
  {
    wordId: 'word-3',
    word: 'gamma',
    boardId: 'board-2',
    boardName: 'Board B',
    pageId: 'page-3',
    pageName: 'Page C',
    status: 'inactive',
    lastReviewDate: null,
  },
]

describe('LevelFiveSettingsPage shared-shell regression', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(reviewApi.listLevelFiveWords).mockResolvedValue(levelFiveItems)
    vi.mocked(reviewApi.removeLevelFiveWords).mockResolvedValue(1)
  })

  it('filters, searches, and keeps inactive items visible when requested', async () => {
    const user = userEvent.setup()

    renderPage()

    expect(await screen.findByRole('heading', { name: 'Manage Level 5 words' })).toBeInTheDocument()
    expect(await screen.findByText('alpha')).toBeInTheDocument()
    expect(screen.getByText('beta')).toBeInTheDocument()
    expect(screen.getByText('gamma')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Inactive' }))
    expect(screen.getByText('gamma')).toBeInTheDocument()
    expect(screen.queryByText('alpha')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'All' }))
    await user.type(screen.getByLabelText('Search'), 'bet')
    expect(screen.getByText('beta')).toBeInTheDocument()
    expect(screen.queryByText('alpha')).not.toBeInTheDocument()
    expect(screen.queryByText('gamma')).not.toBeInTheDocument()
  })

  it('supports single remove and bulk remove without changing shell semantics', async () => {
    const user = userEvent.setup()

    vi.mocked(reviewApi.removeLevelFiveWords)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2)

    renderPage()

    expect(await screen.findByRole('heading', { name: 'Manage Level 5 words' })).toBeInTheDocument()
    const alphaWord = await screen.findByText('alpha')
    const alphaRow = alphaWord.closest('.settings-sequence-item') as HTMLElement | null
    expect(alphaRow).not.toBeNull()
    await user.click(within(alphaRow!).getByRole('button', { name: 'Remove' }))

    await waitFor(() => expect(reviewApi.removeLevelFiveWords).toHaveBeenCalled())
    expect(vi.mocked(reviewApi.removeLevelFiveWords).mock.calls[0]?.[0]).toEqual(['word-1'])

    await user.click(screen.getByRole('button', { name: 'Inactive' }))
    expect(screen.getByText('alpha')).toBeInTheDocument()
    expect(screen.getByText('gamma')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Active' }))
    await user.click(screen.getByRole('checkbox', { name: 'Select beta' }))
    await user.click(screen.getByRole('button', { name: 'Remove selected' }))

    await waitFor(() => expect(vi.mocked(reviewApi.removeLevelFiveWords).mock.calls[1]?.[0]).toEqual(['word-2']))
    expect(screen.getByRole('button', { name: 'Remove selected' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Inactive' }))
    expect(screen.getByText('beta')).toBeInTheDocument()
  })
})
