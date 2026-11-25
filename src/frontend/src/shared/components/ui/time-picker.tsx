import { Clock } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/shared/lib/utils'
import { formatTimeValue, parseTimeValue, toTotalMinutes } from './time-picker-utils'

type TimePickerProps = {
  id?: string
  value: string | null
  onValueChange: (value: string | null) => void
  minuteStep?: number
  min?: string
  max?: string
  placeholder?: string
  disabled?: boolean
  className?: string
  'aria-label'?: string
  'aria-labelledby'?: string
}

export function TimePicker({
  id,
  value,
  onValueChange,
  minuteStep = 15,
  min,
  max,
  placeholder = '--:--',
  disabled = false,
  className,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
}: TimePickerProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const step = Math.max(1, minuteStep)
  const slots = useMemo(() => {
    const result: string[] = []
    for (let minutes = 0; minutes < 24 * 60; minutes += step) {
      result.push(
        formatTimeValue({
          hour: Math.floor(minutes / 60),
          minute: minutes % 60,
          second: 0,
        }),
      )
    }
    return result
  }, [step])

  const minMinutes = toTotalMinutes(min)
  const maxMinutes = toTotalMinutes(max)
  const normalizedValue = value ? (() => {
    const parsed = parseTimeValue(value)
    return parsed ? formatTimeValue(parsed) : value
  })() : null

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown, true)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-input bg-card px-2.5 text-sm font-medium text-foreground transition-colors hover:border-ring/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
          !normalizedValue && 'text-muted-foreground',
          className,
        )}
      >
        <span className="tabular-nums">{normalizedValue ?? placeholder}</span>
        <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label={ariaLabel ? `${ariaLabel} picker` : 'Time picker'}
          className="absolute right-0 top-[calc(100%+6px)] z-50 w-40 rounded-lg border border-border bg-card p-1 shadow-md"
        >
          <div
            role="listbox"
            aria-label={ariaLabel ? `${ariaLabel} options` : 'Time options'}
            className="max-h-56 overflow-y-auto"
          >
            {slots.map((slot) => {
              const slotMinutes = toTotalMinutes(slot) ?? 0
              const slotDisabled =
                (minMinutes !== null && slotMinutes < minMinutes) ||
                (maxMinutes !== null && slotMinutes > maxMinutes)
              const selected = normalizedValue === slot
              return (
                <button
                  key={slot}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  disabled={slotDisabled}
                  onClick={() => {
                    onValueChange(slot)
                    setOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-xs tabular-nums transition-colors',
                    selected
                      ? 'bg-primary text-primary-foreground font-semibold'
                      : 'text-foreground hover:bg-muted',
                    slotDisabled && 'cursor-not-allowed opacity-35 hover:bg-transparent',
                  )}
                >
                  {slot}
                </button>
              )
            })}
          </div>
          {normalizedValue ? (
            <div className="mt-1 border-t border-border pt-1">
              <button
                type="button"
                onClick={() => {
                  onValueChange(null)
                  setOpen(false)
                }}
                className="w-full rounded-md px-2 py-1 text-center text-xs font-medium text-muted-foreground hover:bg-muted hover:text-destructive"
              >
                Clear
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
