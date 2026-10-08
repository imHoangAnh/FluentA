import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { VocabTable } from '@/features/vocabulary/components/VocabTable'
import * as vocabularyApi from '@/features/vocabulary/api/vocabulary.api'
import { vocabularyKeys } from '@/features/vocabulary/api/vocabulary.queries'
import { toast } from '@/shared/lib/toast'

vi.mock('@/features/vocabulary/api/vocabulary.api', async () => ({
  ...await vi.importActual<typeof vocabularyApi>('@/features/vocabulary/api/vocabulary.api'),
  listWords: vi.fn(), updateWord: vi.fn(), createWord: vi.fn(), deleteWord: vi.fn(),
}))
vi.mock('@/shared/lib/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@dnd-kit/core', async () => ({
  ...await vi.importActual('@dnd-kit/core'),
  DndContext: ({ children, onDragEnd }: { children: React.ReactNode; onDragEnd: (event: unknown) => void }) => <><button onClick={() => onDragEnd({ active: { id: 'word' }, over: { id: 'example' } })}>Move Word after Example</button>{children}</>,
}))
const word: vocabularyApi.Word = {
  id: 'word-1', pageId: 'page-1', word: 'mitigate', meaning: 'giam nhe',
  ipaPronunciation: '/mItIgeIt/', context: 'reduce harm', type: 'verb',
  example: 'Mitigate risk.', synonyms: 'reduce', antonyms: 'worsen', createdAt: '', updatedAt: '',
}
const preferences: vocabularyApi.BoardPreferences = { hiddenColumns: [], columnOrder: [...vocabularyApi.DEFAULT_VOCAB_COLUMN_ORDER], columnWidths: {} }
const page = (id: string): vocabularyApi.Page => ({ id, boardId: 'board-1', name: id, createdAt: '', updatedAt: '' })
function renderTable(prefs = preferences, onPreferencesChange = vi.fn().mockResolvedValue(undefined)) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  const view = (id: string, config = prefs) => <QueryClientProvider client={client}><VocabTable page={page(id)} preferences={config} onPreferencesChange={onPreferencesChange} /></QueryClientProvider>
  return { ...render(view('page-1')), client, view }
}
async function edit() { await userEvent.setup().click(await screen.findByRole('button', { name: 'Edit mitigate' })) }
function fillBlank() {
  for (const [label, value] of [['Word', 'alpha'], ['Meaning', 'first'], ['IPA', '/a/'], ['Example', 'Alpha example.']]) {
    fireEvent.change(screen.getByLabelText(`${label} for new word`), { target: { value } })
  }
}
describe('VocabTable row drafts and saved preferences', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(vocabularyApi.listWords).mockImplementation(async id => id === 'page-1' ? [word] : [])
    vi.mocked(vocabularyApi.createWord).mockResolvedValue({ ...word, id: 'created' })
    vi.mocked(vocabularyApi.updateWord).mockResolvedValue(word)
    vi.mocked(vocabularyApi.deleteWord).mockResolvedValue({ deleted: true } as never)
  })
  it('hides optional columns in read and edit rows', async () => {
    renderTable({ ...preferences, hiddenColumns: ['context'] })
    await edit()
    expect(screen.getByLabelText('IPA for word')).toBeInTheDocument()
    expect(screen.queryByLabelText('Context for word')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Synonyms for word')).toBeInTheDocument()
  })
  it('preserves IPA slashes and saves the explicit row only when requested', async () => {
    renderTable()
    await edit()
    fireEvent.change(screen.getByLabelText('IPA for word'), { target: { value: '/mItI/' } })
    fireEvent.blur(screen.getByLabelText('IPA for word'))
    expect(vocabularyApi.updateWord).not.toHaveBeenCalled()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Update mitigate' }))
    await waitFor(() => expect(vocabularyApi.updateWord).toHaveBeenCalledWith('word-1', expect.objectContaining({ ipaPronunciation: '/mItI/' })))
  })
  it('renders word classes using their stable API values', async () => {
    renderTable(); await edit()
    await userEvent.setup().click(screen.getByLabelText('Type for word'))
    expect((await screen.findAllByRole('option')).map(option => option.textContent)).toEqual(vocabularyApi.WORD_TYPE_OPTIONS.map(option => option.label))
    expect(screen.getByRole('option', { name: 'Phrasal Verb' })).toHaveAttribute('data-value', 'phrasalverb')
  })
  it('retains a failed edit for an explicit retry', async () => {
    vi.mocked(vocabularyApi.updateWord).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ ...word, context: 'new context' })
    renderTable(); await edit()
    fireEvent.change(screen.getByLabelText('Context for word'), { target: { value: 'new context' } })
    await userEvent.setup().click(screen.getByRole('button', { name: 'Update mitigate' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not update')
    expect(screen.getByLabelText('Context for word')).toHaveValue('new context')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Update mitigate' }))
    await waitFor(() => expect(vocabularyApi.updateWord).toHaveBeenCalledTimes(2))
  })
  it('keeps add drafts on their originating page and restores them on return', async () => {
    const { rerender, view } = renderTable()
    await userEvent.setup().click(screen.getByTestId('add-vocabulary-row-trigger'))
    fillBlank()
    rerender(view('page-2'))
    expect(await screen.findByTestId('add-vocabulary-row-trigger')).toBeInTheDocument()
    expect(screen.queryByLabelText('Word for new word')).not.toBeInTheDocument()
    rerender(view('page-1'))
    expect(await screen.findByLabelText('Word for new word')).toHaveValue('alpha')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Add word' }))
    await waitFor(() => expect(vocabularyApi.createWord).toHaveBeenCalledWith('page-1', expect.objectContaining({ word: 'alpha' })))
  })
  it('keeps edit drafts across unmount and preference changes without writing browser storage', async () => {
    const storage = vi.spyOn(Storage.prototype, 'setItem')
    const { rerender, view } = renderTable(); await edit()
    fireEvent.change(screen.getByLabelText('Meaning for word'), { target: { value: 'draft A' } })
    rerender(view('page-2')); await screen.findByTestId('add-vocabulary-row-trigger')
    rerender(view('page-1', { ...preferences, updatedAt: 'new', hiddenColumns: ['context'] }))
    expect(await screen.findByLabelText('Meaning for word')).toHaveValue('draft A')
    expect(storage).not.toHaveBeenCalled()
    storage.mockRestore()
  })
  it('a new app QueryClient starts without unsaved drafts', async () => {
    const first = renderTable()
    await userEvent.setup().click(screen.getByTestId('add-vocabulary-row-trigger')); fillBlank()
    first.unmount()
    renderTable()
    expect(await screen.findByTestId('add-vocabulary-row-trigger')).toBeInTheDocument()
    expect(screen.queryByLabelText('Word for new word')).not.toBeInTheDocument()
  })
  it('a delayed create targets the original cache and clears its draft after switching pages', async () => {
    let resolve!: (value: vocabularyApi.Word) => void
    vi.mocked(vocabularyApi.createWord).mockImplementation(() => new Promise(r => { resolve = r }))
    const { rerender, view, client } = renderTable()
    await userEvent.setup().click(screen.getByTestId('add-vocabulary-row-trigger')); fillBlank()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Add word' }))
    rerender(view('page-2')); await screen.findByTestId('add-vocabulary-row-trigger')
    await act(async () => resolve({ ...word, id: 'created', word: 'alpha' }))
    await waitFor(() => expect(client.getQueryData<vocabularyApi.Word[]>(vocabularyKeys.words('page-1'))?.map(item => item.id)).toContain('created'))
    expect(client.getQueryData(vocabularyKeys.words('page-2'))).toEqual([])
    rerender(view('page-1'))
    expect(await screen.findByTestId('add-vocabulary-row-trigger')).toBeInTheDocument()
  })
  it('a delayed edit updates the original page without altering the new page', async () => {
    let resolve!: (value: vocabularyApi.Word) => void
    vi.mocked(vocabularyApi.updateWord).mockImplementation(() => new Promise(r => { resolve = r }))
    const { rerender, view, client } = renderTable(); await edit()
    fireEvent.change(screen.getByLabelText('Meaning for word'), { target: { value: 'saved A' } })
    await userEvent.setup().click(screen.getByRole('button', { name: 'Update mitigate' }))
    rerender(view('page-2')); await screen.findByTestId('add-vocabulary-row-trigger')
    await act(async () => resolve({ ...word, meaning: 'saved A' }))
    await waitFor(() => expect(client.getQueryData<vocabularyApi.Word[]>(vocabularyKeys.words('page-1'))?.[0].meaning).toBe('saved A'))
    expect(client.getQueryData(vocabularyKeys.words('page-2'))).toEqual([])
  })
  it('reorders visible columns while preserving all hidden keys', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    renderTable({ ...preferences, hiddenColumns: ['context', 'synonyms'] }, save)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Move Word after Example' }))
    expect(save.mock.calls[0][0].columnOrder).toEqual(['meaning', 'ipaPronunciation', 'type', 'context', 'example', 'word', 'synonyms', 'antonyms'])
    expect(new Set(save.mock.calls[0][0].columnOrder).size).toBe(8)
  })
  it('rolls back failed resize settings with an error', async () => {
    const save = vi.fn().mockRejectedValue(new Error('offline'))
    renderTable(preferences, save)
    const header = screen.getByLabelText('Resize Word').parentElement!
    fireEvent.mouseDown(screen.getByLabelText('Resize Word'), { clientX: 100 })
    fireEvent.mouseMove(window, { clientX: 180 }); fireEvent.mouseUp(window)
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(save.mock.calls[0][0].columnWidths.word).toBe(300)
    expect(header).toHaveStyle({ width: '220px' })
  })
  it('restores the latest successful order after a later reorder fails', async () => {
    const save = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('offline'))
    renderTable(preferences, save)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Move Word after Example' }))
    const confirmed: string[] = save.mock.calls[0][0].columnOrder
    await userEvent.setup().click(screen.getByRole('button', { name: 'Move Word after Example' }))
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(screen.getAllByRole('button').filter(button => button.textContent?.includes('Word'))[1].textContent).toBe('Word')
    const labels = screen.getAllByRole('button').filter(button => ['Word', 'Meaning', 'IPA', 'Context', 'Type', 'Example', 'Synonyms', 'Antonyms'].includes(button.textContent ?? '')).map(button => button.textContent)
    expect(labels).toEqual(confirmed.map(key => ({ ipaPronunciation: 'IPA' } as Record<string,string>)[key] ?? key[0].toUpperCase()+key.slice(1)))
  })
  it('keeps scroll, wrapping and action controls available', async () => {
    renderTable(); await edit()
    expect(screen.getByTestId('vocab-table-scroll')).toBeInTheDocument()
    expect(screen.getByLabelText('Resize Example')).toBeInTheDocument()
    expect(screen.getByTestId('sticky-actions-header')).toHaveClass('sticky', 'right-0')
    expect(screen.getByTestId('sticky-word-actions')).toHaveClass('sticky', 'right-0')
    expect(screen.getByLabelText('Context for word')).toHaveClass('overflow-hidden', 'whitespace-pre-wrap')
  })
  it('requires confirmation before deleting a word from its edit row', async () => {
    const { client } = renderTable(); await edit()
    client.setQueryData(['practice', 'sessions', 'old-session'], { id: 'old-session' })
    client.setQueryData(['review', 'session', 'old-review'], { id: 'old-review' })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Delete mitigate' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(vocabularyApi.deleteWord).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Delete mitigate' }))
    expect(vocabularyApi.deleteWord).not.toHaveBeenCalled()
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: /^Delete$/ }))
    await waitFor(() => expect(vocabularyApi.deleteWord).toHaveBeenCalledWith('word-1'))
    await waitFor(() => expect(client.getQueryData(['practice', 'sessions', 'old-session'])).toBeUndefined())
    expect(client.getQueryData(['review', 'session', 'old-review'])).toBeUndefined()
  })
})
