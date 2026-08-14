export const todoKeys = {
  all: ['todo'] as const,
  items: ['todo-item'] as const,
  day: (date: string) => ['todo', 'items', date] as const,
  range: (from: string, to: string) => ['todo', 'range', from, to] as const,
  item: (taskId?: string | null) => ['todo-item', taskId] as const,
}
