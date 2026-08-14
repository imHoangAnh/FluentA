export const projectKeys = {
  all: ['project'] as const,
  boards: ['project', 'boards'] as const,
  board: (boardId?: string | null) => ['project', 'board', boardId] as const,
  pomodoroCards: (boardIds?: string) => ['project', 'pomodoro-cards', boardIds] as const,
}
