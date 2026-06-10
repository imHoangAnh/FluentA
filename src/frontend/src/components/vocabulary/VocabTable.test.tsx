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
    getColumnConfiguration: vi.fn(),
    updateWordCell: vi.fn(),
  }
})

const word: vocabularyApi.Word = {
  id: 'word-1',
  pageId: 'page-1',
  word: 'mitigate',
  meaningVn: 'giảm nhẹ',
  meaningEn: 'make less severe',
  class: 'verb',
  example: 'Mitigate risk.',
  thesaurus: '',
  collocation: '',
  note: '',
  customValues: [],
  createdAt: '',
  updatedAt: '',
}

function renderTable(boardLanguage = 'en') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <VocabTable boardId="board-1" page={{ id: 'page-1', boardId: 'board-1', name: 'Page One', sortOrder: 0, createdAt: '', updatedAt: '' }} boardLanguage={boardLanguage} />
    </QueryClientProvider>,
  )
}

describe('VocabTable columns', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders visible custom columns and hides private optional columns', async () => {
    vi.mocked(vocabularyApi.listWords).mockResolvedValue([])
    vi.mocked(vocabularyApi.getColumnConfiguration).mockResolvedValue({
      customColumns: [
        { id: 'text-column', name: 'Register', type: 'text', sortOrder: 0 },
        { id: 'number-column', name: 'Priority', type: 'number', sortOrder: 1 },
      ],
      hiddenColumnKeys: ['note'],
    })
    renderTable()

    expect(await screen.findByLabelText('New Register')).toBeInTheDocument()
    expect(screen.getByLabelText('New Priority')).toHaveAttribute('type', 'number')
    expect(screen.queryByLabelText('New note')).not.toBeInTheDocument()
  })

  it('adapts the secondary meaning column for Chinese boards', async () => {
    vi.mocked(vocabularyApi.listWords).mockResolvedValue([word])
    vi.mocked(vocabularyApi.getColumnConfiguration).mockResolvedValue({ customColumns: [], hiddenColumnKeys: ['thesaurus', 'collocation', 'note'] })
    renderTable('zh')

    expect(await screen.findByLabelText('Pinyin for mitigate')).toBeInTheDocument()
    expect(screen.getByLabelText('New Pinyin')).toBeInTheDocument()
    expect(screen.queryByLabelText('English meaning for mitigate')).not.toBeInTheDocument()
  })

  it('autosaves on Tab and Escape cancels the next draft', async () => {
    const user = userEvent.setup()
    vi.mocked(vocabularyApi.listWords).mockResolvedValue([word])
    vi.mocked(vocabularyApi.getColumnConfiguration).mockResolvedValue({ customColumns: [], hiddenColumnKeys: ['thesaurus', 'collocation', 'note'] })
    vi.mocked(vocabularyApi.updateWordCell).mockResolvedValue({ ...word, word: 'mitigation' })
    renderTable()

    const input = await screen.findByLabelText('Word for mitigate')
    await user.clear(input)
    await user.type(input, 'mitigation')
    await user.tab()
    expect(vocabularyApi.updateWordCell).toHaveBeenCalledWith('board-1', 'word-1', 'word', 'mitigation')

    await user.click(input)
    await user.clear(input)
    await user.type(input, 'discard me')
    await user.keyboard('{Escape}')
    expect(input).toHaveValue('mitigation')
    expect(vocabularyApi.updateWordCell).toHaveBeenCalledTimes(1)
  })

  it('retains a failed draft and retries it inline', async () => {
    const user = userEvent.setup()
    vi.mocked(vocabularyApi.listWords).mockResolvedValue([word])
    vi.mocked(vocabularyApi.getColumnConfiguration).mockResolvedValue({ customColumns: [], hiddenColumnKeys: ['thesaurus', 'collocation', 'note'] })
    vi.mocked(vocabularyApi.updateWordCell)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ ...word, meaningEn: 'reduce harm' })
    renderTable()

    const input = await screen.findByLabelText('English meaning for mitigate')
    await user.clear(input)
    await user.type(input, 'reduce harm')
    await user.tab()
    expect(await screen.findByText('Save failed.')).toBeInTheDocument()
    expect(input).toHaveValue('reduce harm')

    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(vocabularyApi.updateWordCell).toHaveBeenCalledTimes(2)
    expect(await screen.findByLabelText('English meaning for mitigate')).toHaveValue('reduce harm')
  })

  it('moves from the final saved cell to the persistent blank row on Enter', async () => {
    const user = userEvent.setup()
    vi.mocked(vocabularyApi.listWords).mockResolvedValue([word])
    vi.mocked(vocabularyApi.getColumnConfiguration).mockResolvedValue({ customColumns: [], hiddenColumnKeys: ['thesaurus', 'collocation', 'note'] })
    vi.mocked(vocabularyApi.updateWordCell).mockResolvedValue(word)
    renderTable()

    const finalCell = await screen.findByLabelText('Example for mitigate')
    await user.click(finalCell)
    await user.keyboard('{Enter}')
    await waitFor(() => expect(screen.getByLabelText('New word')).toHaveFocus())
  })

  it('keeps Tab traversal on editable cells instead of row actions', async () => {
    const user = userEvent.setup()
    vi.mocked(vocabularyApi.listWords).mockResolvedValue([word])
    vi.mocked(vocabularyApi.getColumnConfiguration).mockResolvedValue({ customColumns: [], hiddenColumnKeys: ['thesaurus', 'collocation', 'note'] })
    renderTable()

    await user.click(await screen.findByLabelText('Example for mitigate'))
    await user.tab()
    expect(screen.getByLabelText('New word')).toHaveFocus()
    await user.tab({ shift: true })
    expect(screen.getByLabelText('Example for mitigate')).toHaveFocus()
  })

  it('serializes same-cell saves so the latest draft wins', async () => {
    const user = userEvent.setup()
    let resolveFirst: ((value: vocabularyApi.Word) => void) | undefined
    vi.mocked(vocabularyApi.listWords).mockResolvedValue([word])
    vi.mocked(vocabularyApi.getColumnConfiguration).mockResolvedValue({ customColumns: [], hiddenColumnKeys: ['thesaurus', 'collocation', 'note'] })
    vi.mocked(vocabularyApi.updateWordCell)
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve }))
      .mockResolvedValueOnce({ ...word, word: 'latest' })
    renderTable()

    const input = await screen.findByLabelText('Word for mitigate')
    await user.clear(input)
    await user.type(input, 'first')
    await user.tab()
    await user.click(input)
    await user.clear(input)
    await user.type(input, 'latest')
    await user.tab()
    expect(vocabularyApi.updateWordCell).toHaveBeenCalledTimes(1)

    resolveFirst?.({ ...word, word: 'first' })
    await waitFor(() => expect(vocabularyApi.updateWordCell).toHaveBeenCalledTimes(2))
    expect(vocabularyApi.updateWordCell).toHaveBeenLastCalledWith('board-1', 'word-1', 'word', 'latest')
  })

  it('merges out-of-order unrelated cell responses without visual overwrite', async () => {
    const user = userEvent.setup()
    let resolveMeaning: ((value: vocabularyApi.Word) => void) | undefined
    vi.mocked(vocabularyApi.listWords).mockResolvedValue([word])
    vi.mocked(vocabularyApi.getColumnConfiguration).mockResolvedValue({ customColumns: [], hiddenColumnKeys: ['thesaurus', 'collocation'] })
    vi.mocked(vocabularyApi.updateWordCell).mockImplementation((_boardId, _wordId, key) => {
      if (key === 'meaningEn') return new Promise((resolve) => { resolveMeaning = resolve })
      return Promise.resolve({ ...word, note: 'formal note' })
    })
    renderTable()

    const meaning = await screen.findByLabelText('English meaning for mitigate')
    const note = screen.getByLabelText('Note for mitigate')
    await user.clear(meaning)
    await user.type(meaning, 'reduce harm')
    await user.tab()
    await user.click(note)
    await user.type(note, 'formal note')
    await user.tab()
    resolveMeaning?.({ ...word, meaningEn: 'reduce harm', note: '' })

    await waitFor(() => expect(screen.getByLabelText('English meaning for mitigate')).toHaveValue('reduce harm'))
    expect(screen.getByLabelText('Note for mitigate')).toHaveValue('formal note')
  })
})
