export const menuContentClassName = [
  'z-50 min-w-44 overflow-hidden rounded-lg border border-border bg-popover p-1.5 text-popover-foreground outline-none',
  'shadow-[0_12px_32px_rgba(16,32,29,0.14),0_2px_8px_rgba(16,32,29,0.06)]',
].join(' ')

export const menuItemClassName = [
  'flex min-h-10 cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium outline-none',
  'transition-colors duration-150',
  'data-[disabled]:pointer-events-none data-[disabled]:opacity-45',
  'data-[highlighted]:bg-secondary data-[highlighted]:text-secondary-foreground',
  'focus:bg-secondary focus:text-secondary-foreground',
].join(' ')

export const menuDestructiveItemClassName = [
  menuItemClassName,
  'text-destructive data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive',
  'focus:bg-destructive/10 focus:text-destructive',
].join(' ')

export const menuLabelClassName = 'px-2.5 py-1.5 text-xs font-semibold text-muted-foreground'
export const menuSeparatorClassName = '-mx-1.5 my-1 h-px bg-border'
