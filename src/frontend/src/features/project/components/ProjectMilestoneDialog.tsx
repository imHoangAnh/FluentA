import { Plus, Trash2 } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Dialog, DialogContent, DialogFooter, DialogTitle } from '@/shared/components/ui/dialog'
import type { ProjectMilestone } from '../api/project.api'

type ProjectMilestoneDialogProps = {
  open: boolean
  milestones: ProjectMilestone[]
  pending: boolean
  onOpenChange: (open: boolean) => void
  onCreateMilestone: (name: string) => Promise<void>
  onRenameMilestone: (milestoneId: string, name: string) => Promise<void>
  onDeleteMilestone: (milestoneId: string) => Promise<void>
}

export function ProjectMilestoneDialog({
  open,
  milestones,
  pending,
  onOpenChange,
  onCreateMilestone,
  onRenameMilestone,
  onDeleteMilestone,
}: ProjectMilestoneDialogProps) {
  const [name, setName] = useState('')

  async function submitCreate(event: FormEvent) {
    event.preventDefault()
    const normalized = name.trim()
    if (!normalized || pending) return
    await onCreateMilestone(normalized)
    setName('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Project Milestones</DialogTitle>

        <form className="project-milestone-dialog__create" onSubmit={submitCreate}>
          <input
            type="text"
            value={name}
            maxLength={120}
            aria-label="New milestone name"
            placeholder="e.g. Milestone M1: Top-Bar & DS"
            onChange={(event) => setName(event.target.value)}
          />
          <button type="submit" className="project-primary-btn" disabled={!name.trim() || pending}>
            <Plus aria-hidden="true" />
            <span>Add</span>
          </button>
        </form>

        <div className="project-milestone-dialog__list">
          {milestones.map((milestone) => (
            <div key={milestone.id} className="project-milestone-dialog__row">
              <input
                type="text"
                defaultValue={milestone.name}
                maxLength={120}
                aria-label={`Milestone ${milestone.name}`}
                onBlur={(event) => {
                  const trimmed = event.target.value.trim()
                  if (trimmed && trimmed !== milestone.name) {
                    void onRenameMilestone(milestone.id, trimmed)
                  }
                }}
              />
              <button
                type="button"
                className="project-milestone-dialog__delete"
                aria-label={`Delete milestone ${milestone.name}`}
                disabled={pending}
                onClick={() => void onDeleteMilestone(milestone.id)}
              >
                <Trash2 aria-hidden="true" />
              </button>
            </div>
          ))}
          {milestones.length === 0 ? (
            <p className="project-milestone-dialog__empty">No milestones yet. Add one above to track board progress.</p>
          ) : null}
        </div>

        <DialogFooter>
          <button type="button" className="project-secondary-btn" onClick={() => onOpenChange(false)}>
            Close
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
