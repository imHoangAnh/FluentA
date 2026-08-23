import type { HTMLAttributes } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useId, useState } from 'react'
import { Input } from '@/shared/components/ui/input'
import { cn } from '@/shared/lib/utils'

type TextFieldProps = {
  label: string
  name: string
  type?: string
  autoComplete?: string
  inputMode?: HTMLAttributes<HTMLInputElement>['inputMode']
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
  autoFocus?: boolean
  className?: string
  inputClassName?: string
}

export function TextField({
  label,
  name,
  type = 'text',
  autoComplete,
  inputMode,
  value,
  onChange,
  placeholder,
  required = true,
  disabled = false,
  autoFocus = false,
  className,
  inputClassName,
}: TextFieldProps) {
  const id = useId()
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'

  return (
    <div className={cn('grid gap-2', className)}>
      <label
        className={cn(
          'text-sm font-medium text-foreground sm:text-[15px]',
          disabled && 'text-muted-foreground',
        )}
        htmlFor={id}
      >
        {label}
      </label>
      <div className="relative">
        <Input
          id={id}
          name={name}
          type={isPassword && showPassword ? 'text' : type}
          autoComplete={autoComplete}
          inputMode={inputMode}
          value={value}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoFocus={autoFocus}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            'h-10 rounded-lg px-3.5 text-sm sm:h-11 sm:text-base xl:h-12',
            isPassword && 'pr-12',
            inputClassName,
          )}
        />
        {isPassword ? (
          <button
            className="absolute inset-y-0 right-0 grid w-12 place-items-center border-0 bg-transparent p-0 text-muted-foreground shadow-none hover:bg-transparent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
            type="button"
            aria-label={showPassword ? 'Conceal characters' : 'Reveal characters'}
            aria-pressed={showPassword}
            disabled={disabled}
            onClick={() => setShowPassword((current) => !current)}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        ) : null}
      </div>
    </div>
  )
}
