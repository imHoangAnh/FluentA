export const dropdownContentClassName = [
  'z-[70] min-w-44 overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-[var(--ds-shadow-md)] outline-none',
  'transition data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in',
].join(' ')

export const dropdownItemClassName = [
  'flex min-h-10 w-full cursor-pointer select-none items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-foreground outline-none transition-colors duration-150',
  'data-focus:bg-secondary data-focus:text-secondary-foreground data-focus:outline-hidden',
  'disabled:pointer-events-none disabled:opacity-50',
].join(' ')

export const dropdownLabelClassName = 'px-3 py-1.5 text-xs font-semibold text-muted-foreground'
export const dropdownSeparatorClassName = '-mx-1 my-1 h-px bg-border'
