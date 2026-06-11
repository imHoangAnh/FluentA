import { CalendarClock, Edit3, Home, Loader2, Plus, Save, Trash2 } from 'lucide-react'
import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import * as countdownApi from '../../lib/api/countdown.api'

function toLocalInput(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hours = `${date.getHours()}`.padStart(2, '0')
  const minutes = `${date.getMinutes()}`.padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function defaultTargetDate() {
  const date = new Date()
  date.setDate(date.getDate() + 7)
  date.setHours(9, 0, 0, 0)
  return toLocalInput(date)
}

function toUtcIso(localValue: string) {
  return new Date(localValue).toISOString()
}

function formatTarget(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function remainingText(targetDate: string, now: Date) {
  const diff = new Date(targetDate).getTime() - now.getTime()
  if (diff <= 0) {
    return 'Completed'
  }

  const totalSeconds = Math.floor(diff / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${days}d ${hours}h ${minutes}m ${seconds}s remaining`
}

export function CountdownPage() {
  const queryClient = useQueryClient()
  const [now, setNow] = useState(() => new Date())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [targetDate, setTargetDate] = useState(defaultTargetDate)
  const [color, setColor] = useState('#4F46E5')
  const [icon, setIcon] = useState('')

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const countdownsQuery = useQuery({
    queryKey: ['countdown', 'events'],
    queryFn: countdownApi.listCountdowns,
  })

  const countdowns = useMemo(
    () => (countdownsQuery.data ?? []).toSorted((left, right) => new Date(left.targetDate).getTime() - new Date(right.targetDate).getTime()),
    [countdownsQuery.data],
  )

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['countdown', 'events'] })
  }

  const resetForm = () => {
    setEditingId(null)
    setName('')
    setTargetDate(defaultTargetDate())
    setColor('#4F46E5')
    setIcon('')
  }

  const createCountdown = useMutation({
    mutationFn: countdownApi.createCountdown,
    onSuccess: async () => {
      resetForm()
      await refresh()
    },
  })

  const updateCountdown = useMutation({
    mutationFn: (input: { id: string; patch: countdownApi.UpdateCountdownInput }) => countdownApi.updateCountdown(input.id, input.patch),
    onSuccess: async () => {
      resetForm()
      await refresh()
    },
  })

  const deleteCountdown = useMutation({
    mutationFn: countdownApi.deleteCountdown,
    onSuccess: async () => {
      await refresh()
    },
  })

  function submitCountdown(event: FormEvent) {
    event.preventDefault()
    if (!name.trim() || !targetDate) return

    const payload = {
      name,
      targetDate: toUtcIso(targetDate),
      color: color.trim() ? color : null,
      icon: icon.trim() ? icon : null,
    }

    if (editingId) {
      updateCountdown.mutate({ id: editingId, patch: payload })
    } else {
      createCountdown.mutate(payload)
    }
  }

  function editCountdown(item: countdownApi.CountdownEvent) {
    setEditingId(item.id)
    setName(item.name)
    setTargetDate(toLocalInput(new Date(item.targetDate)))
    setColor(item.color ?? '#4F46E5')
    setIcon(item.icon ?? '')
  }

  function confirmDelete(item: countdownApi.CountdownEvent) {
    if (window.confirm(`Delete "${item.name}"?`)) {
      deleteCountdown.mutate(item.id)
    }
  }

  return (
    <main className="workspace countdown-workspace">
      <header className="workspace-header">
        <div className="brand-inline">
          <span className="brand-mark brand-mark--small">FA</span>
          <strong>FluentA</strong>
        </div>
        <nav className="workspace-nav" aria-label="Countdown navigation">
          <Link className="ghost-button ghost-button--inline" to="/">
            <Home size={17} /> Vocabulary
          </Link>
        </nav>
      </header>

      <section className="countdown-shell">
        <div className="countdown-hero">
          <div>
            <span className="preview-label">Countdown</span>
            <h1>Important dates</h1>
            <p>{countdowns.length} tracked events</p>
          </div>
          <CalendarClock size={34} />
        </div>

        <form className="countdown-form" onSubmit={submitCountdown}>
          <label>
            Name
            <input
              data-testid="countdown-name-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="IELTS Exam"
            />
          </label>
          <label>
            Target date
            <input
              data-testid="countdown-target-input"
              type="datetime-local"
              value={targetDate}
              onChange={(event) => setTargetDate(event.target.value)}
            />
          </label>
          <label>
            Color
            <input
              aria-label="Countdown color"
              className="countdown-color-input"
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
            />
          </label>
          <label>
            Icon
            <input
              data-testid="countdown-icon-input"
              value={icon}
              onChange={(event) => setIcon(event.target.value)}
              placeholder="Exam"
            />
          </label>
          <button
            className="primary-button"
            type="submit"
            disabled={createCountdown.isPending || updateCountdown.isPending || !name.trim() || !targetDate}
            data-testid="save-countdown-button"
          >
            {createCountdown.isPending || updateCountdown.isPending ? <Loader2 size={18} /> : editingId ? <Save size={18} /> : <Plus size={18} />}
            {editingId ? 'Save event' : 'Add event'}
          </button>
          {editingId ? (
            <button className="ghost-button ghost-button--inline" type="button" onClick={resetForm}>
              Cancel
            </button>
          ) : null}
        </form>

        {countdownsQuery.isLoading ? <p className="flashcard-status">Loading countdowns...</p> : null}
        {countdownsQuery.isError ? <p className="flashcard-status flashcard-status--error">Could not load countdowns.</p> : null}

        {!countdownsQuery.isLoading && !countdownsQuery.isError ? (
          <section className="countdown-list" aria-label="Countdown events">
            {countdowns.length === 0 ? (
              <div className="empty-panel countdown-empty">
                <CalendarClock size={28} />
                <h2>No countdowns yet</h2>
                <p>Add an exam, deadline, or milestone worth keeping in sight.</p>
              </div>
            ) : null}

            {countdowns.map((item) => {
              const completed = new Date(item.targetDate).getTime() <= now.getTime()
              return (
                <article className={completed ? 'countdown-card countdown-card--completed' : 'countdown-card'} key={item.id}>
                  <span className="countdown-color-strip" style={{ backgroundColor: item.color ?? '#4F46E5' }} />
                  <div className="countdown-card__body">
                    <header>
                      <div>
                        <span className="preview-label">{item.icon || 'Event'}</span>
                        <h2>{item.name}</h2>
                      </div>
                      {completed ? <span className="countdown-badge">Completed</span> : null}
                    </header>
                    <strong>{remainingText(item.targetDate, now)}</strong>
                    <p>{completed ? `Event ${item.name} has arrived!` : formatTarget(item.targetDate)}</p>
                    <footer>
                      <button className="ghost-button ghost-button--inline" type="button" onClick={() => editCountdown(item)} aria-label={`Edit ${item.name}`}>
                        <Edit3 size={16} /> Edit
                      </button>
                      <button className="icon-button icon-button--danger" type="button" aria-label={`Delete ${item.name}`} onClick={() => confirmDelete(item)}>
                        <Trash2 size={17} />
                      </button>
                    </footer>
                  </div>
                </article>
              )
            })}
          </section>
        ) : null}
      </section>
    </main>
  )
}
