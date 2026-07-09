import { Check, LoaderCircle, Save, XCircle } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import * as flashcardApi from '../../lib/api/flashcard.api'

const practiceModes: flashcardApi.PracticeMode[] = ['dictation', 'meaningToWord', 'pronunciation']

function sameSequence(left: flashcardApi.PracticeSettings, right: flashcardApi.PracticeSettings) {
  return left.modeSequence.join('|') === right.modeSequence.join('|')
}

export function SettingsPracticePage() {
  const queryClient = useQueryClient()
  const [practiceDraft, setPracticeDraft] = useState<flashcardApi.PracticeSettings | null>(null)
  const [practiceState, setPracticeState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const practiceSettingsQuery = useQuery({
    queryKey: ['practice', 'settings'],
    queryFn: flashcardApi.getPracticeSettings,
  })

  const updatePracticeSettings = useMutation({
    mutationFn: flashcardApi.updatePracticeSettings,
    onMutate: () => {
      setPracticeState('saving')
    },
    onSuccess: (settings) => {
      queryClient.setQueryData(['practice', 'settings'], settings)
      queryClient.setQueryData(['settings'], (current: { practiceSettings?: flashcardApi.PracticeSettings } | undefined) =>
        current ? { ...current, practiceSettings: settings } : current)
      setPracticeDraft(null)
      setPracticeState('saved')
    },
    onError: () => {
      setPracticeState('error')
    },
  })

  const savedPractice = practiceSettingsQuery.data ?? null
  const practice = practiceDraft ?? savedPractice
  const hasUnsavedChanges = practiceDraft !== null && savedPractice !== null && !sameSequence(practiceDraft, savedPractice)

  function moveMode(mode: flashcardApi.PracticeMode, direction: -1 | 1) {
    if (!practice) return

    const index = practice.modeSequence.indexOf(mode)
    const target = index + direction
    if (index < 0 || target < 0 || target >= practice.modeSequence.length) return

    const next = [...practice.modeSequence]
    ;[next[index], next[target]] = [next[target], next[index]]

    const updated = { modeSequence: next }
    setPracticeDraft(updated)
    setPracticeState('idle')
  }

  function toggleMode(mode: flashcardApi.PracticeMode) {
    if (!practice) return

    const active = practice.modeSequence.includes(mode)
    if (active && practice.modeSequence.length === 1) {
      return
    }

    const updated = active
      ? { modeSequence: practice.modeSequence.filter((item) => item !== mode) }
      : { modeSequence: [...practice.modeSequence, mode] }

    if (sameSequence(updated, practice)) return

    setPracticeDraft(updated)
    setPracticeState('idle')
  }

  function savePracticeSettings() {
    if (!practice || !hasUnsavedChanges) return
    updatePracticeSettings.mutate(practice)
  }

  if (practiceSettingsQuery.isLoading && !practice) {
    return (
      <section className="settings-panel settings-panel--loading">
        <LoaderCircle className="settings-spinner" />
        <p>Loading practice settings...</p>
      </section>
    )
  }

  if (practiceSettingsQuery.isError || !practice) {
    return (
      <section className="settings-panel settings-panel--loading">
        <p className="flashcard-status flashcard-status--error">Unable to load practice settings.</p>
      </section>
    )
  }

  return (
    <section className="settings-panel">
      <div className="settings-section-header">
        <div>
          <span className="preview-label">Practice settings</span>
          <h2>Practice mode sequence</h2>
        </div>
        <SettingsStatus
          hasUnsavedChanges={hasUnsavedChanges}
          state={practiceState}
          successLabel="Practice settings saved."
          errorLabel="Unable to save practice settings. Your draft is still here."
        />
      </div>
      <p>Choose the global order Practice uses before each word reaches its recap step.</p>
      <div className="review-mode-options" role="group" aria-label="Practice mode sequence">
        {practiceModes.map((mode) => {
          const active = practice.modeSequence.includes(mode)
          return (
            <button
              key={mode}
              className={active ? 'review-mode review-mode--active' : 'review-mode'}
              type="button"
              onClick={() => toggleMode(mode)}
            >
              {mode === 'meaningToWord' ? 'Meaning -> Word' : capitalize(mode)}
              <small>{active ? 'Included in the sequence.' : 'Click to include this mode.'}</small>
            </button>
          )
        })}
      </div>
      <div className="settings-sequence-list">
        {practice.modeSequence.map((mode, index) => (
          <div key={mode} className="settings-sequence-item">
            <strong>{index + 1}. {mode === 'meaningToWord' ? 'Meaning -> Word' : capitalize(mode)}</strong>
            <div className="deck-actions">
              <button className="secondary-button" type="button" onClick={() => moveMode(mode, -1)}>Up</button>
              <button className="secondary-button" type="button" onClick={() => moveMode(mode, 1)}>Down</button>
            </div>
          </div>
        ))}
      </div>
      <button
        className="primary-button settings-save-button"
        type="button"
        disabled={!hasUnsavedChanges || updatePracticeSettings.isPending}
        onClick={savePracticeSettings}
      >
        <Save size={17} /> {updatePracticeSettings.isPending ? 'Saving practice settings...' : 'Save practice settings'}
      </button>
    </section>
  )
}

function SettingsStatus({
  hasUnsavedChanges,
  state,
  successLabel,
  errorLabel,
}: {
  hasUnsavedChanges: boolean
  state: 'idle' | 'saving' | 'saved' | 'error'
  successLabel: string
  errorLabel: string
}) {
  if (state === 'saving') {
    return <p className="settings-muted"><LoaderCircle size={14} className="settings-spin-inline" /> Saving...</p>
  }

  if (state === 'saved') {
    return <p className="settings-success"><Check size={14} /> {successLabel}</p>
  }

  if (state === 'error') {
    return <p className="flashcard-status flashcard-status--error"><XCircle size={14} /> {errorLabel}</p>
  }

  if (hasUnsavedChanges) {
    return <p className="settings-muted">Unsaved changes.</p>
  }

  return null
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
