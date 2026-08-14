export function formatIpa(value: string) {
  const cleaned = value.trim().replace(/^\/+|\/+$/g, '')
  return `/${cleaned}/`
}

export function formatWordClass(value: string) {
  return value.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()
}

export function hasText(value: string | null | undefined) {
  return Boolean(value?.trim())
}
