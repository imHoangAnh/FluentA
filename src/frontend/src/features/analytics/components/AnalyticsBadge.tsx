import { cn } from '@/shared/lib/utils'

export type AnalyticsBadgeTone = 'primary' | 'success' | 'warning' | 'neutral' | 'danger'

type AnalyticsBadgeProps = {
  label: string
  tone?: AnalyticsBadgeTone
  className?: string
}

export function AnalyticsBadge({ label, tone = 'primary', className }: AnalyticsBadgeProps) {
  return (
    <span className={cn('analytics-pill', `analytics-pill--${tone}`, className)}>
      {label}
    </span>
  )
}
