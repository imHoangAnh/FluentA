import { Eye, EyeOff } from 'lucide-react'
import { useId, useState } from 'react'

type TextFieldProps = {
  label: string
  name: string
  type?: string
  autoComplete?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
}

export function TextField({ label, name, type = 'text', autoComplete, value, onChange, placeholder, required = true }: TextFieldProps) {
  const id = useId()
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="field-control">
        <input
          id={id}
          name={name}
          type={isPassword && showPassword ? 'text' : type}
          autoComplete={autoComplete}
          value={value}
          placeholder={placeholder}
          required={required}
          onChange={(event) => onChange(event.target.value)}
        />
        {isPassword ? (
          <button
            className="password-toggle"
            type="button"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
            onClick={() => setShowPassword((current) => !current)}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        ) : null}
      </div>
    </div>
  )
}
