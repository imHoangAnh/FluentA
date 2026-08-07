import { Bell, CalendarClock, ImagePlus, MoreHorizontal, Plus, Trash2, X } from 'lucide-react'
import { type FormEvent, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { dropdownContentClassName, dropdownDestructiveItemClassName } from '@/shared/components/ui/dropdown-styles'
import { SelectMenu } from '@/shared/components/ui/select-menu'
import * as assetsApi from '@/lib/api/assets.api'
import { restoreTrashEntry } from '@/features/trash'
import { toast } from '@/lib/toast'
import * as countdownApi from '../api/countdown.api'

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
    onSuccess: async (entry) => {
      await refresh()
      toast.success('Countdown moved to Trash. Alerts were removed.', {
        action: {
          label: 'Undo',
          onClick: () => {
            void restoreTrashEntry(entry.id)
              .then(refresh)
              .then(() => toast.success('Countdown restored without alerts.'))
              .catch(() => toast.error('Could not restore the countdown.'))
          },
        },
      })
    },
    onError: () => toast.error('Could not move the countdown to Trash.'),
  })

  function submitCountdown(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) return
    createCountdown.mutate()
  }

  return (
    <>
      <main className="countdown-main">
        <header className="countdown-header">
          <div className="countdown-header-title">
            <CalendarClock size={22} aria-hidden="true" />
            <h1>Countdown</h1>
          </div>
          <button
            ref={createTriggerRef}
            className="countdown-create-button"
            type="button"
            aria-label="New Countdown"
            title="New Countdown"
            onClick={() => setShowFormModal(true)}
          >
            <Plus size={19} />
            <span>New Countdown</span>
          </button>
        </header>

        <div className="countdown-canvas">
          <section className={`countdown-list-area${!countdownsQuery.isLoading && countdowns.length === 0 ? ' countdown-list-area--empty' : ''}`}>
            <div className="countdown-list-container">
              <div className="countdown-card-grid">
                {countdowns.map((item) => (
                  <article key={item.id} className={`countdown-card${item.coverDownloadUrl ? ' countdown-card--covered' : ''}`}>
                    <div className="countdown-card-visual" aria-hidden={!item.coverDownloadUrl}>
                      {item.coverDownloadUrl ? (
                        <img className="countdown-cover-image" src={item.coverDownloadUrl} alt={item.name} />
                      ) : (
                        <div className="countdown-card-fallback" aria-hidden="true">
                          <CalendarClock size={34} />
                        </div>
                      )}
                      {item.coverDownloadUrl ? <div className="countdown-card-scrim" aria-hidden="true" /> : null}
                    </div>
                    <div className="countdown-card-content">
                      <div className="countdown-card-topline">
                        <h2>{item.name}</h2>
                        <Menu as="div" className="relative inline-block">
                          <MenuButton
                            className="countdown-card-menu-trigger"
                            type="button"
                            aria-label={`Open actions for ${item.name}`}
                            title="Countdown actions"
                          >
                            <MoreHorizontal size={18} />
                          </MenuButton>
                          <MenuItems anchor={{ to: 'bottom end', gap: '6px' }} transition className={dropdownContentClassName}>
                            <MenuItem as="button" type="button" className={dropdownDestructiveItemClassName} onClick={() => deleteCountdown.mutate(item.id)}>
                                <Trash2 size={15} />
                                Delete
                            </MenuItem>
                          </MenuItems>
                        </Menu>
                      </div>
                      <div className="countdown-card-count">
                        <strong className={item.isCompleted ? 'countdown-card-count--completed' : undefined}>{statusText(item)}</strong>
                      </div>
                      <div className="countdown-card-footer">
                        <span>{item.isCompleted ? 'Target' : 'Until'} {formatTargetDate(item.targetDate)}</span>
                        <span>{item.alerts.length} alert{item.alerts.length === 1 ? '' : 's'}</span>
                      </div>
                    </div>
                  </article>
                ))}

                {!countdownsQuery.isLoading && countdowns.length === 0 ? (
                  <div className="countdown-empty-state" role="status">
                    <div className="countdown-empty-illustration" aria-hidden="true">
                      <CalendarClock size={66} strokeWidth={1.5} />
                      <Bell className="countdown-empty-illustration__bell" size={28} strokeWidth={1.7} />
                    </div>
                    <h2>No Countdowns Yet</h2>
                    <p>Create your first exam, deadline, or milestone and add customizable alerts.</p>
                    <button className="countdown-empty-create-button" type="button" onClick={() => setShowFormModal(true)}>
                      <Plus size={17} />
                      <span>Create First Countdown</span>
                    </button>
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
                        <SelectMenu
                          aria-label={`Alert ${index + 1} day`}
                          value={alert.alertDay}
                          onChange={(alertDay) => setAlerts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, alertDay } : item))}
                          options={alertDayOptions.map((option) => ({ value: option, label: option }))}
                          className="min-w-40"
                        />
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
    </>
  )
}
