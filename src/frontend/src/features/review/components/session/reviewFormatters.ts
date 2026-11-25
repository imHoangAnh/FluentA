export function hasText(value: string | null | undefined) {
  return Boolean(value?.trim())
}
