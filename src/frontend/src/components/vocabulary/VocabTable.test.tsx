import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { VocabTable } from './VocabTable'
import * as vocabularyApi from '../../lib/api/vocabulary.api'

vi.mock('../../lib/api/vocabulary.api', async () => {
  const actual = await vi.importActual<typeof import('../../lib/api/vocabulary.api')>('../../lib/api/vocabulary.api')
  return {
    ...actual,
    listWords: vi.fn(),
    updateWordCell: vi.fn(),
    createWord: vi.fn(),
    deleteWord: vi.fn(),
  }
})

const word: vocabularyApi.Word = {
  id: 'word-1',
  pageId: 'page-1',
  word: 'mitigate',
  meaningVn: 'giam nhe',
  ipaPronunciation: '/mItIgeIt/',
  definition: 'reduce harm',
  class: 'verb',
  example: 'Mitigate risk.',
  note: '',
  synonyms: 'reduce',
  antonyms: 'worsen',
  createdAt: '',
  updatedAt: '',
}

const preferences: vocabularyApi.BoardPreferences = {
  hiddenColumns: [],
  columnOrder: [...vocabularyApi.DEFAULT_VOCAB_COLUMN_ORDER],
  columnWidths: {},
}

function renderTable(overridePreferences: vocabularyApi.BoardPreferences = preferences, onPreferencesChange = vi.fn().mockResolvedValue(undefined)) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <VocabTable
        boardId="board-1"
        page={{ id: 'page-1', boardId: 'board-1', name: 'Page One', createdAt: '', updatedAt: '' }}
        preferences={overridePreferences}
        onPreferencesChange={onPreferencesChange}
      />
    </QueryClientProvider>,
  )
}

describe('VocabTable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(vocabularyApi.listWords).mockResolvedValue([word])
    vi.mocked(vocabularyApi.createWord).mockResolvedValue(word)
    vi.mocked(vocabularyApi.deleteWord).mockResolvedValue(undefined)
  })

  it('hides nullable fixed columns from board preferences', async () => {
    renderTable({
      ...preferences,
      hiddenColumns: ['definition', 'note'],
    })

    expect(await screen.findByLabelText('IPA pronunciation for mitigate')).toBeInTheDocument()
    expect(screen.queryByLabelText('Definition for mitigate')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Note for mitigate')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Synonyms for mitigate')).toBeInTheDocument()
  })

  it('autosaves IPA values on Tab and preserves slash characters', async () => {
    const user = userEvent.setup()
    vi.mocked(vocabularyApi.updateWordCell).mockResolvedValue({ ...word, ipaPronunciation: '/mItI' })
    renderTable()

    const input = await screen.findByLabelText('IPA pronunciation for mitigate')
    await user.clear(input)
    await user.type(input, '/mItI/')
    await user.tab()

    expect(vocabularyApi.updateWordCell).toHaveBeenCalledWith('board-1', 'word-1', 'ipaPronunciation', '/mItI/')
  })

  it('retains a failed draft and retries it inline', async () => {
    const user = userEvent.setup()
    vi.mocked(vocabularyApi.updateWordCell)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ ...word, definition: 'harm reduction' })
    renderTable()

    const input = await screen.findByLabelText('Definition for mitigate')
    await user.clear(input)
    await user.type(input, 'harm reduction')
    await user.tab()

    expect(await screen.findByText('Save failed.')).toBeInTheDocument()
    expect(input).toHaveValue('harm reduction')
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(vocabularyApi.updateWordCell).toHaveBeenCalledTimes(2)
  })

  it('moves from the final saved cell to the blank row on Enter', async () => {
    const user = userEvent.setup()
    vi.mocked(vocabularyApi.updateWordCell).mockResolvedValue(word)
    renderTable({
      ...preferences,
      hiddenColumns: ['definition', 'note', 'synonyms', 'antonyms'],
    })

    const finalCell = await screen.findByLabelText('Example for mitigate')
    await user.click(finalCell)
    await user.keyboard('{Enter}')

    await waitFor(() => expect(screen.getByLabelText('New word')).toHaveFocus())
  })

  it('renders the horizontal scroll container and resize handles for wide boards', async () => {
    renderTable()

    expect(await screen.findByTestId('vocab-table-scroll')).toBeInTheDocument()
    expect(screen.getByLabelText('Resize Word')).toBeInTheDocument()
    expect(screen.getByLabelText('Resize Example')).toBeInTheDocument()
  })
})
