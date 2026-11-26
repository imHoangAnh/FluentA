import { CalendarDays, FileText, ListTodo, TrendingUp, type LucideIcon } from 'lucide-react'
import logoUrl from '@/shared/assets/fluenta-wordmark.svg'
import './landing.css'

interface LandingPageProps {
  onLogin: () => void
  onRegister: () => void
  onGetStarted: () => void
}

function CardHeading({
  icon: Icon,
  title,
}: {
  icon: LucideIcon
  title: string
}) {
  return (
    <div className="fluenta-landing-card-heading">
      <span className="fluenta-landing-card-icon">
        <Icon aria-hidden="true" />
      </span>
      <h2>{title}</h2>
    </div>
  )
}

function TaskListCard() {
  return (
    <article className="fluenta-landing-card fluenta-landing-task-card">
      <CardHeading icon={ListTodo} title="Task List" />
      <ul className="fluenta-landing-task-list">
        <li>Complete chapter notes</li>
        <li>Review study guide</li>
        <li>Submit project draft</li>
      </ul>
    </article>
  )
}

function ProgressCard() {
  return (
    <article className="fluenta-landing-card fluenta-landing-progress-card">
      <CardHeading icon={TrendingUp} title="Progress" />
      <div className="fluenta-landing-progress-lines" aria-hidden="true">
        <span className="fluenta-landing-skeleton fluenta-landing-skeleton-short" />
        <span className="fluenta-landing-skeleton fluenta-landing-skeleton-medium" />
        <span className="fluenta-landing-skeleton fluenta-landing-skeleton-long" />
        <span className="fluenta-landing-progress-track">
          <span className="fluenta-landing-progress-fill" />
        </span>
      </div>
      <div className="fluenta-landing-progress-label">
        <strong>75%</strong>
        <span aria-hidden="true">|</span>
        <span>Learning Goal</span>
      </div>
    </article>
  )
}

function NotesCard() {
  return (
    <article className="fluenta-landing-card fluenta-landing-notes-card">
      <CardHeading icon={FileText} title="Notes" />
      <p className="fluenta-landing-notes-copy">
        <strong>Study Notes:</strong>
        <span>Core models &amp; training</span>
        <span>workflows.</span>
      </p>
    </article>
  )
}

function CalendarCard() {
  return (
    <article className="fluenta-landing-card fluenta-landing-calendar-card">
      <CardHeading icon={CalendarDays} title="Calendar" />
      <span className="fluenta-landing-calendar-accent" aria-hidden="true" />
      <p className="fluenta-landing-calendar-event">
        <strong>Oct 16 · Study Session</strong>
        <span>2-4PM</span>
      </p>
    </article>
  )
}

export function LandingPage({ onLogin, onRegister, onGetStarted }: LandingPageProps) {
  return (
    <main className="fluenta-landing">
      <div className="fluenta-landing-canvas">
        <div className="fluenta-landing-glow fluenta-landing-glow-top" aria-hidden="true" />
        <div className="fluenta-landing-glow fluenta-landing-glow-bottom" aria-hidden="true" />

        <header className="fluenta-landing-header">
          <img src={logoUrl} alt="FluentA" />
          <nav aria-label="Account">
            <button type="button" className="fluenta-landing-login" onClick={onLogin}>Login</button>
            <button type="button" className="fluenta-landing-register" onClick={onRegister}>Register</button>
          </nav>
        </header>

        <section id="home" className="fluenta-landing-copy">
          <h1>
            Store deeper,
            <br />
            Grow faster
          </h1>
          <p>
            Personal memory engine to retain knowledge, manage
            <br className="fluenta-landing-desktop-break" /> your life, and stay in flow.
          </p>
          <button type="button" onClick={onGetStarted}>
            Get Started
          </button>
        </section>

        <section className="fluenta-landing-cards" aria-label="A preview of your FluentA workspace">
          <TaskListCard />
          <ProgressCard />
          <NotesCard />
          <CalendarCard />
        </section>
      </div>
    </main>
  )
}

export default LandingPage
