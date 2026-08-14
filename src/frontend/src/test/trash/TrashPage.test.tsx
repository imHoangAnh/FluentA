import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TrashPage } from '@/features/trash/pages/TrashPage'
import * as trashApi from '@/features/trash/api/trash.api'
import type { TrashEntry } from '@/shared/api/deletion.contracts'

vi.mock('@/features/trash/api/trash.api', async () => {
  const actual = await vi.importActual<typeof import('@/features/trash/api/trash.api')>('@/features/trash/api/trash.api')
  return {
    ...actual,
    listTrash: vi.fn(),
    restoreTrashEntry: vi.fn(),
    permanentlyDeleteTrashEntry: vi.fn(),
    bulkRestoreTrashEntries: vi.fn(),
    bulkPermanentlyDeleteTrashEntries: vi.fn(),
    emptyTrash: vi.fn(),
  }
})

const items: TrashEntry[] = Array.from({ length: 21 }, (_, index) => ({
  id: `trash-${index + 1}`,
  entityKind: 'Todo',
  entityId: `todo-${index + 1}`,
  displayName: `Deleted item ${index + 1}`,
  originalLocation: 'Today',
  trashedAt: '2026-07-28T00:00:00Z',
  purgeAfterAt: '2026-08-27T00:00:00Z',
}))

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <TrashPage />
    </QueryClientProvider>,
  )
}

describe('TrashPage pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(trashApi.listTrash).mockResolvedValue(items)
  })

  it('keeps Empty Trash on the right of Select all and shows ten items per page', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByText('Deleted item 1')).toBeInTheDocument()
    expect(screen.getByText('Deleted item 10')).toBeInTheDocument()
    expect(screen.queryByText('Deleted item 11')).not.toBeInTheDocument()
    expect(screen.getByTestId('trash-actions')).toHaveClass('items-center', 'justify-between')
    expect(screen.getByRole('button', { name: 'Empty Trash' })).toBeInTheDocument()
    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 1 to 10 of 21 results')

    await user.click(screen.getByRole('button', { name: 'Go to page 2' }))

    expect(screen.queryByText('Deleted item 1')).not.toBeInTheDocument()
    expect(screen.getByText('Deleted item 11')).toBeInTheDocument()
    expect(screen.getByText('Deleted item 20')).toBeInTheDocument()
    expect(screen.queryByText('Deleted item 21')).not.toBeInTheDocument()
    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 11 to 20 of 21 results')

    await user.click(screen.getByRole('checkbox', { name: 'Select all shown' }))
    expect(screen.getByText('10 selected')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Select Deleted item 11' })).toBeChecked()
  })
})
