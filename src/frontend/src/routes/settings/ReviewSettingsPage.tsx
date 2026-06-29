import { ArrowLeft, LogOut, Save } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import * as flashcardApi from '../../lib/api/flashcard.api'
import { useAuthStore } from '../../stores/authStore'

const practiceModes: flashcardApi.PracticeMode[] = ['dictation', 'meaningToWord', 'pronunciation']

export function ReviewSettingsPage() {
  const logout = useAuthStore((state) => state.logout)
  const queryClient = useQueryClient()
  const [practiceDraft, setPracticeDraft] = useState<flashcardApi.PracticeSettings | null>(null)
  const [reviewDraft, setReviewDraft] = useState<flashcardApi.ReviewSettings | null>(null)

  const practiceSettingsQuery = useQuery({ queryKey: ['flashcard', 'practice-settings'], queryFn: flashcardApi.getPracticeSettings })
  const reviewSettingsQuery = useQuery({ queryKey: ['flashcard', 'settings'], queryFn: flashcardApi.getReviewSettings })

  const practiceSettings = practiceDraft ?? practiceSettingsQuery.data ?? { modeSequence: practiceModes }
  const reviewSettings = reviewDraft ?? reviewSettingsQuery.data ?? { dailyLimit: 300, recapAfterAnswer: true }

  const updatePracticeSettings = useMutation({
    mutationFn: flashcardApi.updatePracticeSettings,
    onSuccess: (settings) => {
      queryClient.setQueryData(['flashcard', 'practice-settings'], settings)
    },
  })
  const updateReviewSettings = useMutation({
    mutationFn: flashcardApi.updateReviewSettings,
    onSuccess: (settings) => {
      queryClient.setQueryData(['flashcard', 'settings'], settings)
    },
  })

  function moveMode(mode: flashcardApi.PracticeMode, direction: -1 | 1) {
    const index = practiceSettings.modeSequence.indexOf(mode)
    const target = index + direction
    if (index < 0 || target < 0 || target >= practiceSettings.modeSequence.length) return
    const next = [...practiceSettings.modeSequence]
    ;[next[index], next[target]] = [next[target], next[index]]
    setPracticeDraft({ modeSequence: next })
  }

  function toggleMode(mode: flashcardApi.PracticeMode) {
    const selected = practiceSettings.modeSequence.includes(mode)
    if (selected && practiceSettings.modeSequence.length === 1) return
    if (selected) {
      setPracticeDraft({ modeSequence: practiceSettings.modeSequence.filter((item) => item !== mode) })
      return
    }

    setPracticeDraft({ modeSequence: [...practiceSettings.modeSequence, mode] })
  }

  function submitPractice(event: FormEvent) {
    event.preventDefault()
    updatePracticeSettings.mutate(practiceSettings)
  }

  function submitReview(event: FormEvent) {
    event.preventDefault()
    updateReviewSettings.mutate(reviewSettings)
  }

  return (
    <main className="workspace settings-workspace">
      <header className="workspace-header">
        <div className="brand-inline">
          <span className="brand-mark brand-mark--small">FA</span>
          <strong>FluentA</strong>
        </div>
        <nav className="workspace-nav" aria-label="Settings navigation">
          <Link className="ghost-button ghost-button--inline" to="/flashcards"><ArrowLeft size={17} /> Flashcards</Link>
          <button className="icon-button" type="button" onClick={() => void logout()} aria-label="Logout"><LogOut size={18} /></button>
        </nav>
      </header>

      <section className="settings-panel">
        <span className="preview-label">Practice settings</span>
        <h1>Choose the global practice mode sequence</h1>
        <p>Practice always finishes each word with a flashcard recap. Only the modes below are configurable.</p>
        <form className="settings-form" onSubmit={submitPractice}>
          <div className="review-mode-options" role="group" aria-label="Practice mode sequence">
            {practiceModes.map((mode) => {
              const active = practiceSettings.modeSequence.includes(mode)
              return (
                <button key={mode} className={active ? 'review-mode review-mode--active' : 'review-mode'} type="button" onClick={() => toggleMode(mode)}>
                  {mode === 'meaningToWord' ? 'Meaning -> Word' : mode}
                </button>
              )
            })}
          </div>
          <div className="settings-form">
            {practiceSettings.modeSequence.map((mode, index) => (
              <div key={mode} className="flashcard-board__heading">
                <strong>{index + 1}. {mode === 'meaningToWord' ? 'Meaning -> Word' : mode}</strong>
                <div className="deck-actions">
                  <button className="secondary-button" type="button" onClick={() => moveMode(mode, -1)}>Up</button>
                  <button className="secondary-button" type="button" onClick={() => moveMode(mode, 1)}>Down</button>
                </div>
              </div>
            ))}
          </div>
          <button className="primary-button" type="submit" disabled={updatePracticeSettings.isPending}><Save size={17} /> Save practice settings</button>
        </form>
        {updatePracticeSettings.isSuccess ? <p className="settings-success">Practice settings saved.</p> : null}
        {practiceSettingsQuery.isError || updatePracticeSettings.isError ? <p className="flashcard-status flashcard-status--error">Unable to save practice settings.</p> : null}
      </section>

      <section className="settings-panel">
        <span className="preview-label">Review settings</span>
        <h1>Shape the board review queue</h1>
        <p>Review uses one daily due-word limit and an optional answer recap after each correct response.</p>
        <form className="settings-form" onSubmit={submitReview}>
          <label>
            Daily limit
            <input type="number" min="0" max="1000" value={reviewSettings.dailyLimit} onChange={(event) => setReviewDraft({ ...reviewSettings, dailyLimit: Number(event.target.value) })} />
          </label>
          <label>
            <input type="checkbox" checked={reviewSettings.recapAfterAnswer} onChange={(event) => setReviewDraft({ ...reviewSettings, recapAfterAnswer: event.target.checked })} />
            Recap after each correct answer
          </label>
          <button className="primary-button" type="submit" disabled={updateReviewSettings.isPending}><Save size={17} /> Save review settings</button>
        </form>
        {updateReviewSettings.isSuccess ? <p className="settings-success">Review settings saved.</p> : null}
        {reviewSettingsQuery.isError || updateReviewSettings.isError ? <p className="flashcard-status flashcard-status--error">Unable to save review settings.</p> : null}
      </section>
    </main>
  )
}
