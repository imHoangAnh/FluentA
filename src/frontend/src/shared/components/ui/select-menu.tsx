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
            'inline-flex min-h-10 w-full items-center justify-between gap-x-3 rounded-md border border-gray-300 bg-white px-3 py-2 text-left text-sm font-medium text-gray-900 shadow-xs outline-none transition hover:bg-gray-50 focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-50',
            buttonClassName,
          )}
          {...ariaProps}
        >
          <span className="min-w-0 truncate">{selectedOption?.label ?? value}</span>
          <ChevronDownIcon aria-hidden="true" className="size-5 shrink-0 text-gray-400" />
        </Listbox.Button>
        <Listbox.Options
          transition
          className={cn(
            'absolute left-0 top-full z-50 mt-2 max-h-60 min-w-full overflow-auto rounded-md bg-white py-1 text-gray-700 shadow-lg outline-1 outline-black/5 transition focus:outline-none data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in',
            optionsClassName,
          )}
        >
          {options.map((option) => (
            <Listbox.Option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
              data-value={option.value}
              className="group relative flex min-h-10 w-full cursor-pointer select-none items-center justify-between gap-3 px-4 py-2 text-left text-sm text-gray-700 outline-none data-focus:bg-gray-100 data-focus:text-gray-900 data-selected:font-semibold data-disabled:pointer-events-none data-disabled:opacity-50"
            >
              {({ selected }) => (
                <>
                  <span className="min-w-0 truncate">{option.label}</span>
                  {selected ? <CheckIcon aria-hidden="true" className="size-4 shrink-0 text-indigo-600" /> : null}
                </>
              )}
            </Listbox.Option>
          ))}
        </Listbox.Options>
      </div>
    </Listbox>
  )
}
