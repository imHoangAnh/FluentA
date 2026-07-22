import { type FormEvent, useState } from 'react'
import { X } from 'lucide-react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/shared/components/ui/dialog'

export type PomodoroConfigFormValues = {
  workMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  longBreakAfter: number
}

type PomodoroConfigurationDialogProps = {
  initialValues: PomodoroConfigFormValues
  message: string | null
  onOpenChange: (open: boolean) => void
  onSubmit: (values: PomodoroConfigFormValues) => void
  open: boolean
  pending: boolean
}

export function PomodoroConfigurationDialog({
  initialValues,
  message,
  onOpenChange,
  onSubmit,
  open,
  pending,
}: PomodoroConfigurationDialogProps) {
  const [draft, setDraft] = useState<PomodoroConfigFormValues>(() => ({
    workMinutes: initialValues.workMinutes,
    shortBreakMinutes: initialValues.shortBreakMinutes,
    longBreakMinutes: initialValues.longBreakMinutes,
    longBreakAfter: initialValues.longBreakAfter,
  }))

  function submit(event: FormEvent) {
    event.preventDefault()
    onSubmit(draft)
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!pending) onOpenChange(nextOpen) }}>
      <DialogContent className="pomodoro-config-dialog" aria-describedby="pomodoro-config-description">
        <div className="pomodoro-dialog-header">
          <DialogTitle>Configuration</DialogTitle>
          <DialogClose asChild>
            <button className="pomodoro-icon-button" type="button" aria-label="Close configuration" disabled={pending}>
              <X size={18} />
            </button>
          </DialogClose>
        </div>
        <DialogDescription id="pomodoro-config-description">
          Set the duration of each focus cycle and its breaks.
        </DialogDescription>
        <form onSubmit={submit} className="pomodoro-settings-form">
          <div className="pomodoro-setting-row">
            <div className="pomodoro-setting-label">
              <label htmlFor="pomodoro-work-input">Work session</label>
              <span>{draft.workMinutes} min</span>
            </div>
            <input id="pomodoro-work-input" data-testid="pomodoro-work-input" type="range" min={5} max={60} value={draft.workMinutes} onChange={(event) => setDraft((current) => ({ ...current, workMinutes: Number(event.target.value) }))} />
          </div>
          <div className="pomodoro-setting-row">
            <div className="pomodoro-setting-label">
              <label htmlFor="pomodoro-short-break-input">Short break</label>
              <span>{draft.shortBreakMinutes} min</span>
            </div>
            <input id="pomodoro-short-break-input" data-testid="pomodoro-short-break-input" type="range" min={1} max={15} value={draft.shortBreakMinutes} onChange={(event) => setDraft((current) => ({ ...current, shortBreakMinutes: Number(event.target.value) }))} />
          </div>
          <div className="pomodoro-setting-row">
            <div className="pomodoro-setting-label">
              <label htmlFor="pomodoro-long-break-input">Long break</label>
              <span>{draft.longBreakMinutes} min</span>
            </div>
            <input id="pomodoro-long-break-input" data-testid="pomodoro-long-break-input" type="range" min={10} max={45} value={draft.longBreakMinutes} onChange={(event) => setDraft((current) => ({ ...current, longBreakMinutes: Number(event.target.value) }))} />
          </div>
          <div className="pomodoro-setting-row">
            <div className="pomodoro-setting-label">
              <label htmlFor="pomodoro-long-after-input">Long break after</label>
              <span>{draft.longBreakAfter} sessions</span>
            </div>
            <input id="pomodoro-long-after-input" data-testid="pomodoro-long-after-input" type="range" min={1} max={12} value={draft.longBreakAfter} onChange={(event) => setDraft((current) => ({ ...current, longBreakAfter: Number(event.target.value) }))} />
          </div>

          {message ? <p className="pomodoro-save-message" role="status">{message}</p> : null}

          <DialogFooter className="pomodoro-dialog-footer">
            <DialogClose asChild>
              <button className="pomodoro-dialog-cancel" type="button" disabled={pending}>Cancel</button>
            </DialogClose>
            <button className="pomodoro-dialog-save" type="submit" disabled={pending}>
              {pending ? 'Saving...' : 'Save changes'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
