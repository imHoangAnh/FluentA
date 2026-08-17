export const pomodoroKeys = {
  all: ['pomodoro'] as const,
  config: ['pomodoro', 'config'] as const,
  current: ['pomodoro', 'current'] as const,
  today: ['pomodoro', 'today'] as const,
  todoToday: ['todos', 'pomodoro-today'] as const,
}
