import { Listbox } from '@headlessui/react'
import { ChevronDownIcon, CheckIcon } from '@heroicons/react/20/solid'
import { type ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'

export type SelectMenuOption<T extends string = string> = {
  value: T
  label: ReactNode
  disabled?: boolean
}

type SelectMenuProps<T extends string = string> = {
  value: T
  onChange: (value: T) => void
  options: readonly SelectMenuOption<T>[]
  'aria-label'?: string
  'aria-labelledby'?: string
  id?: string
  className?: string
  buttonClassName?: string
  optionsClassName?: string
  disabled?: boolean
  buttonRef?: React.Ref<HTMLButtonElement>
  testId?: string
}

export function SelectMenu<T extends string = string>({
  value,
  onChange,
  options,
  className,
  buttonClassName,
  optionsClassName,
  disabled,
  buttonRef,
  testId,
  ...ariaProps
}: SelectMenuProps<T>) {
  const selectedOption = options.find((option) => option.value === value)

  return (
    <Listbox value={value} onChange={onChange} disabled={disabled}>
      <div className={cn('relative', className)}>
        <Listbox.Button
          ref={buttonRef}
          data-testid={testId}
          data-value={value}
          className={cn(
            'inline-flex min-h-10 w-full items-center justify-between gap-x-3 rounded-lg border border-input bg-card px-3 py-2 text-left text-sm font-medium text-foreground shadow-[var(--ds-shadow-xs)] outline-none transition hover:border-primary/40 hover:bg-muted/35 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50',
            buttonClassName,
          )}
          {...ariaProps}
        >
          <span className="min-w-0 truncate leading-[1.3]">{selectedOption?.label ?? value}</span>
          <ChevronDownIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        </Listbox.Button>
        <Listbox.Options
          transition
          className={cn(
            'absolute left-0 top-full z-[70] mt-1.5 max-h-60 min-w-full overflow-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-[var(--ds-shadow-md)] transition focus:outline-none data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in',
            optionsClassName,
          )}
        >
          {options.map((option) => (
            <Listbox.Option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
              data-value={option.value}
              className="group relative flex min-h-9 w-full cursor-pointer select-none items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm text-foreground outline-none data-focus:bg-secondary data-focus:text-secondary-foreground data-selected:font-semibold data-disabled:pointer-events-none data-disabled:opacity-50"
            >
              {({ selected }) => (
                <>
                  <span className="min-w-0 truncate">{option.label}</span>
                  {selected ? <CheckIcon aria-hidden="true" className="size-4 shrink-0 text-primary" /> : null}
                </>
              )}
            </Listbox.Option>
          ))}
        </Listbox.Options>
      </div>
    </Listbox>
  )
}
