import type { KanbanCard } from '../api/kanban.api'

export const kanbanPriorities = ['Low', 'Medium', 'High', 'Critical'] as const

export type KanbanCardForm = {
  columnId: string
  title: string
  description: string
  priority: KanbanCard['priority']
  deadline: string
}
