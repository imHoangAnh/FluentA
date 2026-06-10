import { Plus, Save, Trash2 } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as vocabularyApi from '../../lib/api/vocabulary.api'

const emptyWord: vocabularyApi.WordInput = {
  word: '',
  meaningVn: '',
  meaningEn: '',
  class: 'noun',
  example: '',
  thesaurus: '',
  collocation: '',
  note: '',
}

type Props = {
  boardId: string
  page: vocabularyApi.Page
}

export function VocabTable({ boardId, page }: Props) {
  const queryClient = useQueryClient()
  const [newWord, setNewWord] = useState<vocabularyApi.WordInput>(emptyWord)
  const [drafts, setDrafts] = useState<Record<string, vocabularyApi.WordInput>>({})
  const wordsQuery = useQuery({
    queryKey: ['vocab', 'words', page.id],
    queryFn: () => vocabularyApi.listWords(boardId, page.id),
  })

  const refreshWords = () => queryClient.invalidateQueries({ queryKey: ['vocab', 'words', page.id] })
  const createWord = useMutation({
    mutationFn: (input: vocabularyApi.WordInput) => vocabularyApi.createWord(boardId, page.id, input),
    onSuccess: async () => {
      setNewWord(emptyWord)
      await refreshWords()
    },
  })
  const updateWord = useMutation({
    mutationFn: (input: { id: string; word: vocabularyApi.WordInput }) => vocabularyApi.updateWord(boardId, input.id, input.word),
    onSuccess: async (word) => {
      setDrafts((current) => {
        const next = { ...current }
        delete next[word.id]
        return next
      })
      await refreshWords()
    },
  })
  const deleteWord = useMutation({
    mutationFn: vocabularyApi.deleteWord.bind(null, boardId),
    onSuccess: refreshWords,
  })

  function submitWord(event: FormEvent) {
    event.preventDefault()
    createWord.mutate(newWord)
  }

  function updateNewWord(field: keyof vocabularyApi.WordInput, value: string) {
    setNewWord((current) => ({ ...current, [field]: value }))
  }

  function updateDraft(word: vocabularyApi.Word, field: keyof vocabularyApi.WordInput, value: string) {
    setDrafts((current) => ({
      ...current,
      [word.id]: { ...(current[word.id] ?? word), [field]: value },
    }))
  }

  return (
    <section className="word-panel" aria-label={`Vocabulary words for ${page.name}`}>
      <div className="word-panel__header">
        <div>
          <span className="preview-label">Selected page</span>
          <h3>{page.name}</h3>
        </div>
        <strong>{wordsQuery.data?.length ?? 0} words</strong>
      </div>

      <div className="word-table-wrap">
        <form className="word-row word-row--create" onSubmit={submitWord}>
          <input aria-label="New word" value={newWord.word} onChange={(event) => updateNewWord('word', event.target.value)} placeholder="Word" required />
          <input aria-label="New Vietnamese meaning" value={newWord.meaningVn} onChange={(event) => updateNewWord('meaningVn', event.target.value)} placeholder="Vietnamese meaning" required />
          <input aria-label="New English meaning" value={newWord.meaningEn} onChange={(event) => updateNewWord('meaningEn', event.target.value)} placeholder="English definition" required />
          <select aria-label="New word class" value={newWord.class} onChange={(event) => updateNewWord('class', event.target.value)}>
            <option value="noun">noun</option>
            <option value="verb">verb</option>
            <option value="adj">adj</option>
            <option value="adv">adv</option>
            <option value="phrase">phrase</option>
            <option value="other">other</option>
          </select>
          <input aria-label="New example" value={newWord.example} onChange={(event) => updateNewWord('example', event.target.value)} placeholder="Example sentence" required />
          <input aria-label="New thesaurus" value={newWord.thesaurus ?? ''} onChange={(event) => updateNewWord('thesaurus', event.target.value)} placeholder="Thesaurus" />
          <input aria-label="New collocation" value={newWord.collocation ?? ''} onChange={(event) => updateNewWord('collocation', event.target.value)} placeholder="Collocation" />
          <input aria-label="New note" value={newWord.note ?? ''} onChange={(event) => updateNewWord('note', event.target.value)} placeholder="Note" />
          <button className="primary-button word-action" type="submit" disabled={createWord.isPending} data-testid="create-word-button">
            <Plus size={16} /> Add
          </button>
        </form>

        {wordsQuery.isLoading ? <p className="word-status">Loading words...</p> : null}
        {wordsQuery.data?.map((word) => {
          const draft = drafts[word.id] ?? word
          return (
            <div className="word-row" key={word.id}>
              <input aria-label={`Word ${word.word}`} value={draft.word} onChange={(event) => updateDraft(word, 'word', event.target.value)} />
              <input aria-label={`Vietnamese meaning for ${word.word}`} value={draft.meaningVn} onChange={(event) => updateDraft(word, 'meaningVn', event.target.value)} />
              <input aria-label={`English meaning for ${word.word}`} value={draft.meaningEn} onChange={(event) => updateDraft(word, 'meaningEn', event.target.value)} />
              <select aria-label={`Class for ${word.word}`} value={draft.class} onChange={(event) => updateDraft(word, 'class', event.target.value)}>
                <option value="noun">noun</option>
                <option value="verb">verb</option>
                <option value="adj">adj</option>
                <option value="adv">adv</option>
                <option value="phrase">phrase</option>
                <option value="other">other</option>
              </select>
              <input aria-label={`Example for ${word.word}`} value={draft.example} onChange={(event) => updateDraft(word, 'example', event.target.value)} />
              <input aria-label={`Thesaurus for ${word.word}`} value={draft.thesaurus ?? ''} onChange={(event) => updateDraft(word, 'thesaurus', event.target.value)} />
              <input aria-label={`Collocation for ${word.word}`} value={draft.collocation ?? ''} onChange={(event) => updateDraft(word, 'collocation', event.target.value)} />
              <input aria-label={`Note for ${word.word}`} value={draft.note ?? ''} onChange={(event) => updateDraft(word, 'note', event.target.value)} />
              <div className="word-actions">
                <button className="icon-button" type="button" aria-label={`Save ${word.word}`} onClick={() => updateWord.mutate({ id: word.id, word: draft })}>
                  <Save size={16} />
                </button>
                <button
                  className="icon-button icon-button--danger"
                  type="button"
                  aria-label={`Delete ${word.word}`}
                  onClick={() => {
                    if (window.confirm(`Delete "${word.word}"?`)) deleteWord.mutate(word.id)
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
