import { Check, ChevronDown, Kanban, Pencil, Plus, Trash2 } from 'lucide-react'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import type { ProjectBoardSummary } from '../api/project.api'

type ProjectBoardSwitcherProps = {
  boards: ProjectBoardSummary[]
  selectedBoardId: string | null
  activeBoardName: string
  creating: boolean
  onSelectBoard: (boardId: string) => void
  onCreateBoard: (name: string) => Promise<void>
  onRenameBoard: (boardId: string, name: string) => Promise<void>
  onRequestDeleteBoard: (board: ProjectBoardSummary) => void
}

export function ProjectBoardSwitcher({
  boards,
  selectedBoardId,
  activeBoardName,
  creating,
  onSelectBoard,
  onCreateBoard,
  onRenameBoard,
  onRequestDeleteBoard,
}: ProjectBoardSwitcherProps) {
  const [open, setOpen] = useState(false)
  const [newBoardName, setNewBoardName] = useState('')
  const [editingBoardId, setEditingBoardId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
        setEditingBoardId(null)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
        setEditingBoardId(null)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  async function submitCreate(event: FormEvent) {
    event.preventDefault()
    const normalized = newBoardName.trim()
    if (!normalized || creating) return
    await onCreateBoard(normalized)
    setNewBoardName('')
    setOpen(false)
  }

  async function submitRename(board: ProjectBoardSummary) {
    const normalized = editingName.trim()
    setEditingBoardId(null)
    if (!normalized || normalized === board.name) return
    await onRenameBoard(board.id, normalized)
  }

  return (
    <div className="project-switcher" ref={containerRef} data-testid="project-navigation">
      <button
        type="button"
        className="project-switcher__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Project board: ${activeBoardName}`}
        onClick={() => setOpen((current) => !current)}
      >
        <Kanban className="project-switcher__icon" aria-hidden="true" />
        <h1 className="project-switcher__title">{activeBoardName}</h1>
        <ChevronDown className="project-switcher__chevron" aria-hidden="true" />
      </button>

      {open ? (
        <div className="project-switcher__menu" role="dialog" aria-label="Switch project board">
          <div className="project-switcher__list" role="listbox" aria-label="Projects">
            {boards.map((board) => {
              const isSelected = board.id === selectedBoardId
              if (editingBoardId === board.id) {
                return (
                  <form
                    key={board.id}
                    className="project-switcher__rename-form"
                    onSubmit={(event) => {
                      event.preventDefault()
                      void submitRename(board)
                    }}
                  >
                    <input
                      type="text"
                      value={editingName}
                      maxLength={180}
                      autoFocus
                      aria-label={`Rename ${board.name}`}
                      onChange={(event) => setEditingName(event.target.value)}
                      onBlur={() => void submitRename(board)}
                    />
                  </form>
                )
              }

              return (
                <div
                  key={board.id}
                  className={`project-switcher__option-row${isSelected ? ' project-switcher__option-row--active' : ''}`}
                >
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className="project-switcher__option-btn"
                    onClick={() => {
                      onSelectBoard(board.id)
                      setOpen(false)
                    }}
                  >
                    <span className="project-switcher__option-check">
                      {isSelected ? <Check aria-hidden="true" /> : null}
                    </span>
                    <span className="project-switcher__option-name">{board.name}</span>
                  </button>
                  <button
                    type="button"
                    className="project-switcher__row-action"
                    aria-label={`Rename project ${board.name}`}
                    onClick={() => {
                      setEditingBoardId(board.id)
                      setEditingName(board.name)
                    }}
                  >
                    <Pencil aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="project-switcher__row-action project-switcher__row-action--danger"
                    aria-label={`Delete project ${board.name}`}
                    onClick={() => {
                      setOpen(false)
                      onRequestDeleteBoard(board)
                    }}
                  >
                    <Trash2 aria-hidden="true" />
                  </button>
                </div>
              )
            })}
          </div>

          <form className="project-switcher__create-form" onSubmit={submitCreate}>
            <Plus aria-hidden="true" />
            <input
              type="text"
              value={newBoardName}
              maxLength={180}
              placeholder="New project..."
              aria-label="New project name"
              data-testid="project-board-name-input"
              onChange={(event) => setNewBoardName(event.target.value)}
            />
            <button type="submit" disabled={!newBoardName.trim() || creating}>
              {creating ? '...' : 'Create'}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  )
}
