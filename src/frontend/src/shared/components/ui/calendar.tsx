import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DayPicker } from 'react-day-picker'
import { cn } from '@/shared/lib/utils'
import { buttonVariants } from '@/shared/components/ui/button-variants'

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  components,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        months: 'relative flex flex-col gap-4',
        month: 'flex flex-col gap-3',
        month_caption: 'flex justify-start items-center h-7 pr-16',
        caption_label: 'text-sm font-semibold text-foreground',
        nav: 'flex items-center gap-1 absolute right-0 top-0 z-20',
        button_previous: cn(
          buttonVariants({ variant: 'outline', size: 'icon-sm' }),
          'h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100 rounded-md cursor-pointer pointer-events-auto',
        ),
        button_next: cn(
          buttonVariants({ variant: 'outline', size: 'icon-sm' }),
          'h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100 rounded-md cursor-pointer pointer-events-auto',
        ),
        month_grid: 'w-full border-collapse space-y-1',
        weekdays: 'flex w-full justify-between',
        weekday:
          'text-muted-foreground font-semibold text-xs text-center w-8 flex items-center justify-center',
        weeks: 'w-full flex flex-col gap-1',
        week: 'flex w-full justify-between',
        day: 'relative p-0 text-center text-xs flex items-center justify-center w-8 h-8 bg-transparent border-0 outline-none shadow-none ring-0',
        day_button: cn(
          buttonVariants({ variant: 'ghost' }),
          'h-8 w-8 p-0 font-normal aria-selected:opacity-100 rounded-full cursor-pointer transition-colors',
        ),
        range_start: 'day-range-start',
        range_end: 'day-range-end',
        selected: '',
        today: 'font-semibold',
        outside:
          'day-outside text-muted-foreground/40',
        disabled: 'text-muted-foreground opacity-50',
        range_middle: '',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chevronClassName, ...chevronProps }) => {
          if (orientation === 'left') {
            return <ChevronLeft className={cn('h-4 w-4', chevronClassName)} {...chevronProps} />
          }
          return <ChevronRight className={cn('h-4 w-4', chevronClassName)} {...chevronProps} />
        },
        ...components,
      }}
      {...props}
    />
  )
}

Calendar.displayName = 'Calendar'

export { Calendar }
