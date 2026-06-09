import { BookMarked, LogOut, RotateCcw, ShieldCheck } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'

export function WorkspacePage() {
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)

  return (
    <main className="workspace">
      <header className="workspace-header">
        <div className="brand-inline">
          <span className="brand-mark brand-mark--small">FA</span>
          <strong>FluentA</strong>
        </div>
        <button className="icon-button" type="button" onClick={() => void logout()} aria-label="Logout">
          <LogOut size={18} />
        </button>
      </header>

      <section className="workspace-hero">
        <div>
          <p className="preview-label">Protected workspace</p>
          <h1>Welcome, {user?.fullName ?? 'learner'}</h1>
          <p>Your auth foundation is active. Vocabulary and flashcards are queued for later stories.</p>
        </div>
        <div className="profile-card">
          <ShieldCheck size={24} />
          <span>{user?.email}</span>
          <strong>{user?.isEmailVerified ? 'Email verified locally' : 'Verification pending'}</strong>
        </div>
      </section>

      <section className="workspace-grid">
        <article>
          <BookMarked size={22} />
          <h2>Vocabulary Board</h2>
          <p>Deferred until the next accepted story.</p>
        </article>
        <article>
          <RotateCcw size={22} />
          <h2>Review queue</h2>
          <p>Flashcards and spaced repetition are intentionally out of scope.</p>
        </article>
      </section>
    </main>
  )
}
