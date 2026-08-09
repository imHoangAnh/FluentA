export const dropdownContentClassName = [
  'z-50 min-w-44 overflow-hidden rounded-md bg-white py-1 text-gray-700 outline-1 outline-black/5 shadow-lg',
  'transition data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in',
].join(' ')

export const dropdownItemClassName = [
  'block min-h-10 w-full cursor-pointer select-none px-4 py-2 text-left text-sm text-gray-700 outline-none',
  'data-focus:bg-gray-100 data-focus:text-gray-900 data-focus:outline-hidden',
  'disabled:pointer-events-none disabled:opacity-50',
].join(' ')

export const dropdownLabelClassName = 'px-4 py-2 text-xs font-semibold text-gray-500'
export const dropdownSeparatorClassName = 'my-1 h-px bg-gray-200'

export const dropdownDestructiveItemClassName = [
  dropdownItemClassName,
  'text-red-600 data-focus:bg-red-50 data-focus:text-red-700',
].join(' ')
