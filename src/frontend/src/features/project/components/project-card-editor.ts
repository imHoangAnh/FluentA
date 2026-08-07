import type { ProjectCard } from '../api/project.api'

export const ProjectPriority = {
  Low: 'Low',
  Medium: 'Medium',
  High: 'High',
  Critical: 'Critical',
} as const

export const projectPriorities = [
  ProjectPriority.Low,
  ProjectPriority.Medium,
  ProjectPriority.High,
  ProjectPriority.Critical,
] as const

export type ProjectCardForm = {
  columnId: string
  title: string
  description: string
  priority: ProjectCard['priority']
  deadline: string
}
