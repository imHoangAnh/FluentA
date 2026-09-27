import { type ChangeEvent, useRef } from 'react'

type OtpCodeInputProps = {
  value: string
  onChange: (value: string) => void
  onComplete?: (value: string) => void
  disabled?: boolean
  autoFocus?: boolean
  invalid?: boolean
}

const CODE_LENGTH = 6

export function OtpCodeInput({ value, onChange, onComplete, disabled = false, autoFocus = false, invalid = false }: OtpCodeInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH)
    onChange(next)
    if (next.length === CODE_LENGTH) onComplete?.(next)
  }

  return (
    <div className={`fluenta-otp-cells${invalid ? ' is-invalid' : ''}`}>
      <div className="fluenta-otp-cell-row" aria-hidden="true">
        {Array.from({ length: CODE_LENGTH }, (_, index) => (
          <span className="fluenta-otp-cell" key={index}>{value[index] ?? ''}</span>
        ))}
      </div>
      <input
        ref={inputRef}
        className="fluenta-otp-input"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={CODE_LENGTH}
        aria-label="Six-digit verification code"
        aria-invalid={invalid}
        value={value}
        disabled={disabled}
        autoFocus={autoFocus}
        onChange={handleChange}
      />
    </div>
  )
}
