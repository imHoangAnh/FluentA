import { ArrowLeft, LogOut, Save } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import * as flashcardApi from '../../lib/api/flashcard.api'
import { useAuthStore } from '../../stores/authStore'

export function ReviewSettingsPage() {
  const logout = useAuthStore((state) => state.logout)
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<flashcardApi.ReviewSettings | null>(null)
  const settingsQuery = useQuery({ queryKey: ['flashcard', 'settings'], queryFn: flashcardApi.getReviewSettings })
  const settings = draft ?? settingsQuery.data ?? { newCardsPerDay: 20, reviewCardsPerDay: 200 }
  const updateSettings = useMutation({
    mutationFn: flashcardApi.updateReviewSettings,
    onSuccess: async (settings) => {
      queryClient.setQueryData(['flashcard', 'settings'], settings)
      await queryClient.invalidateQueries({ queryKey: ['flashcard', 'decks'] })
    },
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    updateSettings.mutate(settings)
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
        <span className="preview-label">Review settings</span>
        <h1>Shape your daily practice</h1>
        <p>These limits apply globally across every All Words Spaced session.</p>
        <form className="settings-form" onSubmit={submit}>
          <label>
            New cards per day
            <input type="number" min="0" max="1000" value={settings.newCardsPerDay} onChange={(event) => setDraft({ ...settings, newCardsPerDay: Number(event.target.value) })} />
          </label>
          <label>
            Review cards per day
            <input type="number" min="0" max="1000" value={settings.reviewCardsPerDay} onChange={(event) => setDraft({ ...settings, reviewCardsPerDay: Number(event.target.value) })} />
          </label>
          <button className="primary-button" type="submit" disabled={updateSettings.isPending}><Save size={17} /> Save review settings</button>
        </form>
        {updateSettings.isSuccess ? <p className="settings-success">Review settings saved.</p> : null}
        {settingsQuery.isError || updateSettings.isError ? <p className="flashcard-status flashcard-status--error">Unable to save review settings.</p> : null}
      </section>
    </main>
  )
}
