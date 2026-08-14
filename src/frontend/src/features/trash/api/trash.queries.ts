export const trashKeys = {
  all: ['trash'] as const,
  list: (type?: string, query?: string) => ['trash', type, query] as const,
}
