import type { ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Alert } from '@/shared/components/ui/alert'
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card'
import { Skeleton } from '@/shared/components/ui/skeleton'

type SettingsPanelProps = {
  badge?: ReactNode
  children: ReactNode
  description: string
  eyebrow: string
  footer?: ReactNode
  status?: ReactNode
  title: string
}

export function SettingsPanel({
  badge,
  children,
  description,
  eyebrow,
  footer,
  status,
  title,
}: SettingsPanelProps) {
  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader className="gap-4 border-b border-border p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div className="min-w-0">
          <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{eyebrow}</p>
          <h2 className="mt-1 text-xl font-semibold tracking-[-0.02em] text-foreground">{title}</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        {status ?? badge ? <div className="shrink-0">{status ?? badge}</div> : null}
      </CardHeader>
      <CardContent className="grid gap-6 p-4 sm:p-5">
        {children}
        {footer ? <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">{footer}</div> : null}
      </CardContent>
    </Card>
  )
}

export function SettingsLoadingPanel({ label }: { label: string }) {
  return (
    <Card className="p-5" aria-busy="true" aria-label={label}>
      <span className="sr-only">{label}</span>
      <div className="grid gap-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-full max-w-md" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </Card>
  )
}

export function SettingsErrorPanel({ message }: { message: string }) {
  return (
    <Card className="p-5">
      <Alert className="flex items-start gap-2 border-destructive/25 bg-destructive/5 text-destructive">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{message}</span>
      </Alert>
    </Card>
  )
}
