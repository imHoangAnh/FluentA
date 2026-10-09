import { AlertTriangle } from 'lucide-react'
import { Alert } from '@/shared/components/ui/alert'
import { Card } from '@/shared/components/ui/card'
import { Skeleton } from '@/shared/components/ui/skeleton'

export function ProfileLoadingPanel({ label }: { label: string }) {
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

export function ProfileErrorPanel({ message }: { message: string }) {
  return (
    <Card className="p-5">
      <Alert className="flex items-start gap-2 border-destructive/25 bg-destructive/5 text-destructive">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{message}</span>
      </Alert>
    </Card>
  )
}
