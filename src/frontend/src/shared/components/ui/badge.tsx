import type { HTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/shared/lib/utils'

const badgeVariants = cva('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', {
  variants: {
    variant: {
      default: 'border-transparent bg-secondary text-secondary-foreground',
      outline: 'border-border bg-card text-muted-foreground',
      destructive: 'border-transparent bg-destructive/10 text-destructive',
      neutral: 'border-transparent bg-muted text-[var(--ds-foreground-secondary)]',
      success: 'border-transparent bg-[var(--ds-success-tint)] text-[var(--ds-success)]',
      warning: 'border-transparent bg-[var(--ds-warning-tint)] text-[var(--ds-warning-strong)]',
    },
  },
  defaultVariants: { variant: 'default' },
})

function Badge({ className, variant, ...props }: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge }
