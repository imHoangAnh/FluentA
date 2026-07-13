import type { HTMLAttributes } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useId, useState } from 'react'
import { Input } from '@/components/ui/input'

type TextFieldProps = { label: string; name: string; type?: string; autoComplete?: string; inputMode?: HTMLAttributes<HTMLInputElement>['inputMode']; value: string; onChange: (value: string) => void; placeholder?: string; required?: boolean }

export function TextField({ label, name, type = 'text', autoComplete, inputMode, value, onChange, placeholder, required = true }: TextFieldProps) {
  const id = useId(); const [showPassword, setShowPassword] = useState(false); const isPassword = type === 'password'
  return <div className="grid gap-2"><label className="text-sm font-medium text-foreground" htmlFor={id}>{label}</label><div className="relative"><Input id={id} name={name} type={isPassword && showPassword ? 'text' : type} autoComplete={autoComplete} inputMode={inputMode} value={value} placeholder={placeholder} required={required} onChange={(event) => onChange(event.target.value)} className={isPassword ? 'pr-11' : undefined} />{isPassword ? <button className="absolute inset-y-0 right-0 grid w-10 place-items-center border-0 bg-transparent p-0 text-muted-foreground shadow-none hover:bg-transparent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword((current) => !current)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button> : null}</div></div>
}
