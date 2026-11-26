import { cva } from 'class-variance-authority'

export const buttonVariants = cva(
  'inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-[var(--ds-shadow-xs)] hover:bg-[#0d5e58] active:bg-[#0b504b]',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        outline: 'border border-input bg-card text-foreground shadow-[var(--ds-shadow-xs)] hover:border-primary/35 hover:bg-accent/60 hover:text-accent-foreground',
        ghost: 'text-muted-foreground hover:bg-muted hover:text-foreground',
        destructive: 'bg-destructive text-destructive-foreground shadow-[var(--ds-shadow-xs)] hover:bg-destructive/90',
      },
      size: {
        sm: 'h-8 px-3 text-xs [&_svg]:size-3.5',
        default: 'h-10 px-4 [&_svg]:size-4',
        lg: 'h-11 px-5 text-base [&_svg]:size-5',
        icon: 'size-10 p-0 [&_svg]:size-4',
        'icon-sm': 'size-8 p-0 [&_svg]:size-4',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)
