import { CalendarClock, ImagePlus, Plus, Trash2, X } from 'lucide-react'
import { type FormEvent, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as assetsApi from '@/lib/api/assets.api'
import * as countdownApi from '../api/countdown.api'
import { AppShell } from '@/shared/components/layout/AppShell'

const alertDayOptions = ['OnTargetDay', '1DayBefore', '3DaysBefore', '7DaysBefore'] as const

function defaultTargetDate() {
  const date = new Date()
  date.setDate(date.getDate() + 7)
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`
}

function defaultAlert() {
  return { alertDay: '1DayBefore', alertTime: '09:00' }
}

function formatTargetDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}

function statusText(item: countdownApi.CountdownEvent) {
  if (item.isCompleted) {
    return 'Completed'
  }

  const diff = Math.ceil((new Date(`${item.targetDate}T00:00:00`).getTime() - new Date().getTime()) / 86_400_000)
  return diff <= 0 ? 'Today' : `${diff} day${diff === 1 ? '' : 's'} left`
}

export function CountdownPage() {
  const queryClient = useQueryClient()

  const [showFormModal, setShowFormModal] = useState(false)
  const [name, setName] = useState('')
  const [targetDate, setTargetDate] = useState(defaultTargetDate)
  const [alerts, setAlerts] = useState<Array<{ alertDay: string; alertTime: string }>>([defaultAlert()])
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const dialogTitleId = useId()
  const createTriggerRef = useRef<HTMLButtonElement | null>(null)

  const countdownsQuery = useQuery({
    queryKey: ['countdown', 'events'],
    queryFn: countdownApi.listCountdowns,
  })

  const countdowns = useMemo(() => countdownsQuery.data ?? [], [countdownsQuery.data])

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['countdown', 'events'] })
  }

  const resetForm = useCallback(() => {
    setName('')
    setTargetDate(defaultTargetDate())
    setAlerts([defaultAlert()])
    setCoverFile(null)
    setFormError(null)
    setShowFormModal(false)
    window.requestAnimationFrame(() => createTriggerRef.current?.focus())
  }, [])

  useEffect(() => {
    if (!showFormModal) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') resetForm()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [resetForm, showFormModal])

  const createCountdown = useMutation({
    mutationFn: async () => {
      let coverAssetId: string | null = null
      if (coverFile) {
        const asset = await assetsApi.uploadCountdownCoverAsset(coverFile)
        coverAssetId = asset.id
      }

      return countdownApi.createCountdown({
        name,
        targetDate,
        alerts,
        coverAssetId,
      })
    },
    onSuccess: async () => {
      resetForm()
      await refresh()
    },
    onError: () => setFormError('Countdown could not be created.'),
  })

  const deleteCountdown = useMutation({
    mutationFn: countdownApi.deleteCountdown,
    onSuccess: async () => {
      await refresh()
    },
  })

  function submitCountdown(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) return
    createCountdown.mutate()
  }

  return (
    <AppShell title="Countdowns" description="Track important dates and reminder alerts.">
      <main className="countdown-main">
        <header className="countdown-header">
          <div className="countdown-header-title">
            <h2>Countdowns</h2>
            <p>Date-based milestones with fixed Vietnam-local alerts.</p>
          </div>
          <button ref={createTriggerRef} className="add-event-btn" type="button" onClick={() => setShowFormModal(true)}>
            <Plus size={20} />
            <span>New Countdown</span>
          </button>
        </header>

        <div className="countdown-canvas">
          <section className="countdown-list-area">
            <div className="countdown-list-container">
              <div className="countdown-events-wrapper">
                {countdowns.map((item) => (
                  <article key={item.id} className="event-list-item active">
                    <div className="event-icon-box">
                      {item.coverUrl ? <img className="countdown-cover-image" src={item.coverUrl} alt={item.name} /> : <CalendarClock size={28} />}
                    </div>
                    <div className="event-info">
                      <h4 className="event-title">{item.name}</h4>
                      <p className="event-subtitle">{item.alerts.length} alert{item.alerts.length === 1 ? '' : 's'} · {formatTargetDate(item.targetDate)}</p>
                      <p className="event-subtitle">{item.alerts.map((alert) => `${alert.alertDay} ${alert.alertTime}`).join(' • ')}</p>
                    </div>
                    <div className="event-meta">
                      <p className={`event-days ${item.isCompleted ? 'event-days-completed' : ''}`}>{statusText(item)}</p>
                      <button
                        className="kanban-danger-btn"
                        type="button"
                        aria-label={`Delete ${item.name}`}
                        onClick={() => {
                          if (window.confirm(`Delete "${item.name}"?`)) deleteCountdown.mutate(item.id)
                        }}
                      >
                        <Trash2 size={16} /> Delete
                      </button>
                    </div>
                  </article>
                ))}

                {!countdownsQuery.isLoading && countdowns.length === 0 ? (
                  <div className="empty-panel">
                    <CalendarClock size={32} />
                    <h3>No countdowns yet</h3>
                    <p>Create an exam, deadline, or milestone with one to five alerts.</p>
                  </div>
                ) : null}

                {countdownsQuery.isLoading ? <p className="flashcard-status">Loading countdowns...</p> : null}
                {countdownsQuery.isError ? <p className="flashcard-status flashcard-status--error">Could not load countdowns.</p> : null}
              </div>
            </div>
          </section>
        </div>

        {showFormModal ? (
          <div className="modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && resetForm()}>
            <div className="modal-content" role="dialog" aria-modal="true" aria-labelledby={dialogTitleId}>
              <div className="modal-header">
                <h3 id={dialogTitleId}>Create Countdown</h3>
                <button type="button" aria-label="Close countdown dialog" onClick={resetForm}><X size={20} /></button>
              </div>
              <form onSubmit={submitCountdown}>
                <label>
                  Countdown name
                  <input data-testid="countdown-name-input" required value={name} onChange={(event) => setName(event.target.value)} placeholder="E.g., JLPT N2 Exam" />
                </label>
                <label>
                  Target date
                  <input data-testid="countdown-target-input" type="date" required value={targetDate} onChange={(event) => setTargetDate(event.target.value)} />
                </label>
                <label>
                  Cover image (optional)
                  <div className="color-picker-wrapper">
                    <ImagePlus size={18} />
                    <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setCoverFile(event.target.files?.[0] ?? null)} />
                  </div>
                </label>
                <div className="detail-notes">
                  <label>Alerts</label>
                  <div className="notes-box countdown-alerts-list">
                    {alerts.map((alert, index) => (
                      <div className="countdown-alert-row" key={`${alert.alertDay}-${index}`}>
                        <select aria-label={`Alert ${index + 1} day`} value={alert.alertDay} onChange={(event) => setAlerts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, alertDay: event.target.value } : item))}>
                          {alertDayOptions.map((option) => <option value={option} key={option}>{option}</option>)}
                        </select>
                        <input aria-label={`Alert ${index + 1} time`} type="time" value={alert.alertTime} onChange={(event) => setAlerts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, alertTime: event.target.value } : item))} />
                        <button type="button" className="btn-cancel" onClick={() => setAlerts((current) => current.filter((_, itemIndex) => itemIndex !== index))} disabled={alerts.length === 1}>
                          Remove alert
                        </button>
                      </div>
                    ))}
                    <button type="button" className="add-event-btn" onClick={() => setAlerts((current) => current.length >= 5 ? current : [...current, defaultAlert()])}>
                      <Plus size={18} />
                      <span>Add alert</span>
                    </button>
                  </div>
                </div>
                {formError ? <p className="flashcard-status flashcard-status--error" role="alert">{formError}</p> : null}
                <div className="modal-actions">
                  <button type="button" className="btn-cancel" onClick={resetForm}>Cancel</button>
                  <button data-testid="save-countdown-button" type="submit" className="btn-submit" disabled={createCountdown.isPending}>Create Countdown</button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </main>
    </AppShell>
  )
}
