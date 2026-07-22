import { render, screen, waitFor } from '@testing-library/react'
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
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter><LevelFiveSettingsPage /></MemoryRouter>
    </QueryClientProvider>,
  )
}

const levelFiveItems: reviewApi.LevelFiveReviewItem[] = [
  {
    wordId: 'word-1', word: 'alpha', boardId: 'board-1', boardName: 'Board A',
    pageId: 'page-1', pageName: 'Page A', status: 'active', lastReviewDate: '2026-07-08T00:00:00Z',
  },
  {
    wordId: 'word-2', word: 'beta', boardId: 'board-1', boardName: 'Board A',
    pageId: 'page-2', pageName: 'Page B', status: 'active', lastReviewDate: '2026-07-07T00:00:00Z',
  },
  {
    wordId: 'word-3', word: 'gamma', boardId: 'board-2', boardName: 'Board B',
    pageId: 'page-3', pageName: 'Page C', status: 'inactive', lastReviewDate: null,
  },
]

async function chooseFilter(user: ReturnType<typeof userEvent.setup>, label: 'All' | 'Active' | 'Inactive') {
  await user.click(screen.getByRole('button', { name: /Filter Level 5 words/ }))
  await user.click(await screen.findByRole('menuitemradio', { name: label }))
}

describe('LevelFiveSettingsPage redesigned management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(reviewApi.listLevelFiveWords).mockResolvedValue(levelFiveItems)
    vi.mocked(reviewApi.removeLevelFiveWords).mockResolvedValue(1)
  })

  it('places search before one status dropdown and keeps inactive items discoverable', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Level 5 words' })).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Search Level 5 words' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /current filter All/ })).toBeInTheDocument()
    expect(screen.getByText('alpha')).toBeInTheDocument()
    expect(screen.getByText('beta')).toBeInTheDocument()
    expect(screen.getByText('gamma')).toBeInTheDocument()

    await chooseFilter(user, 'Inactive')
    expect(screen.getByText('gamma')).toBeInTheDocument()
    expect(screen.queryByText('alpha')).not.toBeInTheDocument()

    await chooseFilter(user, 'All')
    await user.type(screen.getByRole('searchbox', { name: 'Search Level 5 words' }), 'bet')
    expect(screen.getByText('beta')).toBeInTheDocument()
    expect(screen.queryByText('alpha')).not.toBeInTheDocument()
    expect(screen.queryByText('gamma')).not.toBeInTheDocument()
  })

  it('selects only visible active words from the rightmost header checkbox', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByText('alpha')).toBeInTheDocument()
    const selectAll = screen.getByRole('checkbox', { name: 'Select all visible active words' })
    await user.click(selectAll)

    expect(screen.getByRole('checkbox', { name: 'Select alpha' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Select beta' })).toBeChecked()
    expect(screen.queryByRole('checkbox', { name: 'Select gamma' })).not.toBeInTheDocument()
    expect(screen.getByText('2 words selected')).toBeInTheDocument()

    await user.click(selectAll)
    expect(screen.getByRole('checkbox', { name: 'Select alpha' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Select beta' })).not.toBeChecked()

    await user.type(screen.getByRole('searchbox', { name: 'Search Level 5 words' }), 'bet')
    await user.click(screen.getByRole('checkbox', { name: 'Select all visible active words' }))
    expect(screen.getByRole('checkbox', { name: 'Select beta' })).toBeChecked()
    expect(screen.getByText('1 word selected')).toBeInTheDocument()
  })

  it('requires confirmation, preserves cancel, and removes only after confirm', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByText('alpha')).toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: 'Select alpha' }))
    await user.click(screen.getByRole('button', { name: 'Remove selected' }))

    expect(screen.getByRole('alertdialog', { name: 'Remove selected words?' })).toBeInTheDocument()
    expect(screen.getByText('1 word will become inactive. Review history will be preserved.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(reviewApi.removeLevelFiveWords).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Remove selected' }))
    await user.click(screen.getByRole('button', { name: 'Confirm remove' }))

    await waitFor(() => expect(vi.mocked(reviewApi.removeLevelFiveWords).mock.calls[0]?.[0]).toEqual(['word-1']))
    expect(screen.getByRole('button', { name: 'Remove selected' })).toBeDisabled()

    await chooseFilter(user, 'Inactive')
    expect(screen.getByText('alpha')).toBeInTheDocument()
    expect(screen.getByText('gamma')).toBeInTheDocument()
  })

  it('keeps the confirmation open and selection intact when remove fails', async () => {
    const user = userEvent.setup()
    vi.mocked(reviewApi.removeLevelFiveWords).mockRejectedValueOnce(new Error('Temporary remove failure.'))
    renderPage()

    expect(await screen.findByText('alpha')).toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: 'Select alpha' }))
    await user.click(screen.getByRole('button', { name: 'Remove selected' }))
    await user.click(screen.getByRole('button', { name: 'Confirm remove' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Temporary remove failure.')
    expect(screen.getByRole('alertdialog', { name: 'Remove selected words?' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('checkbox', { name: 'Select alpha' })).toBeChecked()
  })
})
