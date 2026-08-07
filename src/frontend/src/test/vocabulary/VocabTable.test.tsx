import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { VocabTable } from '@/features/vocabulary/components/VocabTable'
import * as vocabularyApi from '@/features/vocabulary/api/vocabulary.api'

vi.mock('@/features/vocabulary/api/vocabulary.api', async () => {
  const actual = await vi.importActual<typeof import('@/features/vocabulary/api/vocabulary.api')>('@/features/vocabulary/api/vocabulary.api')
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
    vi.mocked(vocabularyApi.deleteWord).mockResolvedValue({ id: 'trash-word' } as never)
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

  it('shows all extended Word classes with readable labels and stable API values', async () => {
    renderTable()

    const classSelect = await screen.findByLabelText('Class for mitigate')
    await userEvent.setup().click(classSelect)
    const options = await screen.findAllByRole('option')

    expect(options.map((option) => option.textContent)).toEqual([
      'Noun', 'Verb', 'Adjective', 'Adverb', 'Phrase', 'Collocation',
      'Phrasal Verb', 'Idiom', 'Proverb', 'Noun Phrase', 'Verb Phrase', 'Other',
    ])
    expect(screen.getByRole('option', { name: 'Phrasal Verb' })).toHaveAttribute('data-value', 'phrasalverb')
    expect(screen.getByRole('option', { name: 'Noun Phrase' })).toHaveAttribute('data-value', 'nounphrase')
    expect(screen.getByRole('option', { name: 'Verb Phrase' })).toHaveAttribute('data-value', 'verbphrase')
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

  it('keeps the Add and Delete action column pinned to the right while data columns scroll', async () => {
    renderTable()

    await screen.findByLabelText('Delete mitigate')

    expect(screen.getByTestId('sticky-actions-header')).toHaveClass('sticky', 'right-0', 'bg-muted')
    expect(screen.getByTestId('sticky-word-actions')).toHaveClass('sticky', 'right-0', 'bg-card')
    expect(screen.getByTestId('sticky-create-actions')).toHaveClass('sticky', 'right-0', 'bg-secondary')
  })

  it('uses independently sized wrapped editors with visible column dividers', async () => {
    renderTable()

    const wordEditor = await screen.findByLabelText('Word for mitigate')
    const definitionEditor = screen.getByLabelText('Definition for mitigate')

    expect(wordEditor.tagName).toBe('TEXTAREA')
    expect(definitionEditor.tagName).toBe('TEXTAREA')
    expect(wordEditor).toHaveClass('overflow-hidden')
    expect(definitionEditor).toHaveClass('overflow-hidden')
    expect(screen.getByLabelText('Resize Word').parentElement).toHaveClass('border-foreground/70')
  })

  it('moves a Word to Trash immediately without a confirmation dialog', async () => {
    const user = userEvent.setup()
    renderTable()

    await user.click(await screen.findByRole('button', { name: 'Delete mitigate' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    await waitFor(() => expect(vocabularyApi.deleteWord).toHaveBeenCalledWith('board-1', 'word-1'))
  })
})
