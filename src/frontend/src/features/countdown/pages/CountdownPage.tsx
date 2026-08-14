import { Bell, CalendarClock, ChevronDown, ImagePlus, MoreHorizontal, Plus, Trash2, X } from 'lucide-react'
import { type FormEvent, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { dropdownContentClassName, dropdownDestructiveItemClassName } from '@/shared/components/ui/dropdown-styles'
import { SelectMenu } from '@/shared/components/ui/select-menu'
import { uploadAsset } from '@/features/assets'
import { restoreTrashEntry } from '@/features/trash'
import { toast } from '@/shared/lib/toast'
import * as countdownApi from '../api/countdown.api'
import { countdownKeys } from '../api/countdown.queries'

const alertDayOptions = ['OnTargetDay', '1DayBefore', '3DaysBefore', '7DaysBefore'] as const
const repeatOptions = [
  { value: 'None', label: 'Does not repeat' },
  { value: 'Weekly', label: 'Weekly' },
  { value: 'Monthly', label: 'Monthly' },
  { value: 'Yearly', label: 'Yearly' },
] as const

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
    return `Complete at ${formatTargetDate(item.targetDate)}`
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
  const [repeatPattern, setRepeatPattern] = useState<countdownApi.CountdownRepeatPattern>('None')
  const [openBoard, setOpenBoard] = useState<'active' | 'complete'>('active')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const dialogTitleId = useId()
  const createTriggerRef = useRef<HTMLButtonElement | null>(null)

  const countdownsQuery = useQuery({
    queryKey: countdownKeys.events,
    queryFn: countdownApi.listCountdowns,
  })

  const countdowns = useMemo(() => countdownsQuery.data ?? [], [countdownsQuery.data])

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: countdownKeys.events })
  }

  const resetForm = useCallback(() => {
    setName('')
    setTargetDate(defaultTargetDate())
    setAlerts([defaultAlert()])
    setRepeatPattern('None')
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
        const asset = await uploadAsset(coverFile, 'countdown-cover')
        coverAssetId = asset.id
      }

      return countdownApi.createCountdown({
        name,
        targetDate,
        alerts,
        coverAssetId,
        repeatPattern,
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

  function selectRepeatPattern(nextPattern: string) {
    const next = nextPattern as countdownApi.CountdownRepeatPattern
    setRepeatPattern(next)
    if (next !== 'None' && !alerts.some((alert) => alert.alertDay === 'OnTargetDay')) {
      setAlerts((current) => [...current, { alertDay: 'OnTargetDay', alertTime: '09:00' }])
    }
  }

  function updateAlertDay(index: number, alertDay: string) {
    if (repeatPattern !== 'None' && alerts[index]?.alertDay === 'OnTargetDay' && alertDay !== 'OnTargetDay'
      && alerts.filter((alert) => alert.alertDay === 'OnTargetDay').length === 1) {
      return
    }

    setAlerts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, alertDay } : item))
  }

  function removeAlert(index: number) {
    const alert = alerts[index]
    if (repeatPattern !== 'None' && alert?.alertDay === 'OnTargetDay'
      && alerts.filter((item) => item.alertDay === 'OnTargetDay').length === 1) {
      return
    }

    setAlerts((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  const activeCountdowns = useMemo(() => countdowns.filter((item) => !item.isCompleted), [countdowns])
  const completedCountdowns = useMemo(() => countdowns.filter((item) => item.isCompleted), [countdowns])

  function renderBoard(board: 'active' | 'complete', title: string, items: countdownApi.CountdownEvent[]) {
    const isOpen = openBoard === board
    return (
      <section className={`countdown-board countdown-board--${board}`}>
        <button
          className="countdown-board-header"
          type="button"
          aria-label={`${title} board, ${items.length} countdown${items.length === 1 ? '' : 's'}`}
          aria-expanded={isOpen}
          aria-controls={`countdown-board-${board}`}
          onClick={() => setOpenBoard(board)}
        >
          <span>
            <h2>{title}</h2>
            <small>{items.length} countdown{items.length === 1 ? '' : 's'}</small>
          </span>
          <ChevronDown className={isOpen ? 'countdown-board-chevron countdown-board-chevron--open' : 'countdown-board-chevron'} size={18} aria-hidden="true" />
        </button>
        {isOpen ? (
          <div className="countdown-board-content" id={`countdown-board-${board}`}>
            {items.length > 0 ? (
              <div className="countdown-board-grid">
                {items.map((item) => (
                  <article key={item.id} className={`countdown-card${item.isCompleted ? ' countdown-card--completed' : ''}${item.coverDownloadUrl ? ' countdown-card--covered' : ''}`}>
                    <div className="countdown-card-visual" aria-hidden={!item.coverDownloadUrl}>
                      {item.coverDownloadUrl ? (
                        <img className="countdown-cover-image" src={item.coverDownloadUrl} alt={item.name} />
                      ) : (
                        <div className="countdown-card-fallback" aria-hidden="true"><CalendarClock size={34} /></div>
                      )}
                      {item.coverDownloadUrl ? <div className="countdown-card-scrim" aria-hidden="true" /> : null}
                    </div>
                    <div className="countdown-card-content">
                      <div className="countdown-card-topline">
                        <h2 title={item.name}>{item.name}</h2>
                        <Menu as="div" className="relative inline-block">
                          <MenuButton className="countdown-card-menu-trigger" type="button" aria-label={`Open actions for ${item.name}`} title="Countdown actions"><MoreHorizontal size={18} /></MenuButton>
                          <MenuItems anchor={{ to: 'bottom end', gap: '6px' }} transition className={dropdownContentClassName}>
                            <MenuItem as="button" type="button" className={`${dropdownDestructiveItemClassName} countdown-card-delete-menu-item`} onClick={() => deleteCountdown.mutate(item.id)}>
                              <span className="countdown-card-delete-menu-item__icon" aria-hidden="true"><Trash2 size={15} /></span>
                              <span>Delete</span>
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
              </div>
            ) : (
              <p className="countdown-board-empty" role="status">No {board === 'active' ? 'active' : 'completed'} countdowns.</p>
            )}
          </div>
        ) : null}
      </section>
    )
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
              {countdowns.length > 0 ? <div className="countdown-board-stack">
                {renderBoard('active', 'Active', activeCountdowns)}
                {renderBoard('complete', 'Complete', completedCountdowns)}
              </div> : null}

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
                  <input data-testid="countdown-name-input" required maxLength={50} value={name} onChange={(event) => setName(event.target.value)} placeholder="E.g., JLPT N2 Exam" />
                </label>
                <label>
                  Target date
                  <input data-testid="countdown-target-input" type="date" required value={targetDate} onChange={(event) => setTargetDate(event.target.value)} />
                </label>
                <label>
                  Repeat
                  <SelectMenu aria-label="Repeat pattern" value={repeatPattern} onChange={selectRepeatPattern} options={repeatOptions.map((option) => ({ value: option.value, label: option.label }))} />
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
                          onChange={(alertDay) => updateAlertDay(index, alertDay)}
                          options={alertDayOptions.map((option) => ({ value: option, label: option }))}
                          className="min-w-40"
                        />
                        <input aria-label={`Alert ${index + 1} time`} type="time" value={alert.alertTime} onChange={(event) => setAlerts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, alertTime: event.target.value } : item))} />
                        <button type="button" className="btn-cancel" onClick={() => removeAlert(index)} disabled={alerts.length === 1 || (repeatPattern !== 'None' && alert.alertDay === 'OnTargetDay' && alerts.filter((item) => item.alertDay === 'OnTargetDay').length === 1)}>
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
                <p className="countdown-name-hint">{name.trim().length}/50 characters</p>
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
