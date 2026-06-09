import { BookOpen, Brain, CheckCircle2, Layers3 } from 'lucide-react'
import { type ReactNode } from 'react'

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="auth-shell">
      <section className="brand-panel" aria-label="FluentA product preview">
        <div className="brand-mark" aria-hidden="true">FA</div>
        <div>
          <h1>FluentA</h1>
          <p className="brand-copy">
            Build your language memory loop from one protected workspace.
          </p>
        </div>

        <div className="loop-card">
          <div className="loop-card__header">
            <span>Today</span>
            <strong>Review queue</strong>
          </div>
          <div className="loop-steps">
            <span><BookOpen size={18} /> Add vocabulary</span>
            <span><Layers3 size={18} /> Cards sync</span>
            <span><Brain size={18} /> Active recall</span>
            <span><CheckCircle2 size={18} /> Spaced review</span>
          </div>
        </div>

        <div className="workspace-preview">
          <div>
            <span className="preview-label">Protected workspace</span>
            <strong>IELTS foundations</strong>
          </div>
          <button type="button">Logout</button>
        </div>
      </section>

      <section className="form-panel">{children}</section>
    </main>
  )
}
