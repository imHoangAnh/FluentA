import type { ReactNode } from 'react'
import { Check, LoaderCircle, XCircle } from 'lucide-react'

export type SettingsSaveState = 'idle' | 'saving' | 'saved' | 'error'

type SettingsSaveStatusProps = {
  errorLabel: string
  hasUnsavedChanges: boolean
  state: SettingsSaveState
  successLabel: string
}

export function SettingsSaveStatus({
  errorLabel,
  hasUnsavedChanges,
  state,
  successLabel,
}: SettingsSaveStatusProps) {
  if (state === 'saving') {
    return <Status icon={<LoaderCircle className="animate-spin" />} label="Saving..." />
  }

  if (state === 'saved') {
    return <Status icon={<Check />} label={successLabel} />
  }

  if (state === 'error') {
    return <Status destructive icon={<XCircle />} label={errorLabel} />
  }

  if (hasUnsavedChanges) {
    return <span className="text-xs font-medium text-muted-foreground">Unsaved changes</span>
  }

  return <span className="text-xs text-muted-foreground">No unsaved changes</span>
}

function Status({ destructive = false, icon, label }: { destructive?: boolean; icon: ReactNode; label: string }) {
  return (
    <span role={destructive ? 'alert' : undefined} className={destructive
      ? 'inline-flex items-center gap-1.5 text-xs font-medium text-destructive'
      : 'inline-flex items-center gap-1.5 text-xs font-medium text-foreground'}
    >
      <span className="[&_svg]:size-3.5" aria-hidden="true">{icon}</span>
      {label}
    </span>
  )
}
