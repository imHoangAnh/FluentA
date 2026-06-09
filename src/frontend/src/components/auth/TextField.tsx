type TextFieldProps = {
  label: string
  name: string
  type?: string
  autoComplete?: string
  value: string
  onChange: (value: string) => void
}

export function TextField({ label, name, type = 'text', autoComplete, value, onChange }: TextFieldProps) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}
