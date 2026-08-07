import type { KanbanCard } from '../api/kanban.api'

export enum KanbanPriority {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Critical = 'Critical',
}

export const kanbanPriorities = [
  KanbanPriority.Low,
  KanbanPriority.Medium,
  KanbanPriority.High,
  KanbanPriority.Critical,
] as const

export type KanbanCardForm = {
  columnId: string
  title: string
  description: string
  priority: KanbanCard['priority']
  deadline: string
}
