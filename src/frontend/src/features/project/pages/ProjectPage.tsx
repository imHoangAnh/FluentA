import {
  CheckSquare,
  FolderPlus,
  Plus,
  Trash2,
} from 'lucide-react'
import { type DragEvent, type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertDialog,
  AlertDialogActionButton,
  AlertDialogCancelButton,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogFooter, DialogTitle } from '@/shared/components/ui/dialog'
import { SelectMenu } from '@/shared/components/ui/select-menu'
import { toast } from '@/shared/lib/toast'
import { todayUtc } from '@/shared/lib/date'
import { ProjectBoardSwitcher } from '../components/ProjectBoardSwitcher'
import { ProjectCardDetailPanel } from '../components/ProjectCardDetailPanel'
import { ProjectMilestoneDialog } from '../components/ProjectMilestoneDialog'
import { type ProjectCardForm, projectPriorities } from '../components/project-card-editor'
import * as projectApi from '../api/project.api'
import { projectKeys } from '../api/project.queries'
import '../project.css'

type CardEditor =
  | { mode: 'create'; boardId: string; columnId: string }
  | { mode: 'edit'; boardId: string; cardId: string }

function formatCardDate(deadline: string | null | undefined, isDoneColumn: boolean, today: string) {
  if (isDoneColumn) return 'Done'
  if (!deadline) return null
  const dateOnly = deadline.slice(0, 10)
  if (dateOnly === today) return 'Today'
  const [year, month, day] = dateOnly.split('-').map(Number)
  if (!year || !month || !day) return deadline
  const utc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', timeZone: 'UTC' }).format(utc)
}

function deadlineState(deadline: string | null | undefined, today: string) {
  if (!deadline) return 'none'
  const dateOnly = deadline.slice(0, 10)
  if (dateOnly < today) return 'overdue'
  const [y, m, d] = dateOnly.split('-').map(Number)
  const [ty, tm, td] = today.split('-').map(Number)
  const diffDays = (Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86_400_000
  return diffDays <= 7 ? 'this-week' : 'later'
}

function cardMatches(
  card: projectApi.ProjectCard,
  filters: { priority: string; deadline: string; milestoneId: string },
  today: string,
) {
  if (filters.priority && card.priority !== filters.priority) return false
  if (filters.milestoneId && card.milestoneId !== filters.milestoneId) return false
  if (filters.deadline === 'has' && !card.deadline) return false
  if (filters.deadline === 'overdue' && deadlineState(card.deadline, today) !== 'overdue') return false
  if (filters.deadline === 'week' && deadlineState(card.deadline, today) !== 'this-week') return false
  return true
}

function emptyCardForm(columnId = ''): ProjectCardForm {
  return {
    columnId,
    title: '',
    description: '',
    priority: 'Medium',
    deadline: '',
    milestoneId: null,
    labelId: null,
    initialChecklistTitles: [],
  }
}

function isDoneColumnName(name: string) {
  const normalized = name.trim().toLowerCase()
  return normalized === 'done' || normalized === 'completed' || normalized.includes('done')
}

function priorityFallbackTone(priority: projectApi.ProjectCard['priority']): projectApi.ProjectLabelTone {
  if (priority === 'Critical' || priority === 'High') return 'warning'
  if (priority === 'Low') return 'primary'
  return 'neutral'
}

export function ProjectPage() {
  const queryClient = useQueryClient()
  const today = useMemo(() => todayUtc(), [])
  const [boardName, setBoardName] = useState('')
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null)
  const [columnName, setColumnName] = useState('')
  const [columnComposerOpen, setColumnComposerOpen] = useState(false)
  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false)
  const [cardEditor, setCardEditor] = useState<CardEditor | null>(null)
  const [cardForm, setCardForm] = useState<ProjectCardForm>(() => emptyCardForm())
  const [filters, setFilters] = useState({ priority: '', deadline: '', milestoneId: '' })
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null)
  const [deletingBoard, setDeletingBoard] = useState<projectApi.ProjectBoardSummary | null>(null)
  const [deletingColumn, setDeletingColumn] = useState<{ boardId: string; columnId: string; name: string } | null>(null)
  const [deletingCard, setDeletingCard] = useState<{ boardId: string; cardId: string; title: string } | null>(null)
  const [emptyBoardComposerOpen, setEmptyBoardComposerOpen] = useState(false)
  const editorTriggerRef = useRef<HTMLElement | null>(null)
  const newBoardInputRef = useRef<HTMLInputElement>(null)
  const columnInputRef = useRef<HTMLInputElement>(null)

  const closeEditor = useCallback(() => {
    const trigger = editorTriggerRef.current
    setCardEditor(null)
    window.requestAnimationFrame(() => {
      if (trigger?.isConnected) trigger.focus()
    })
  }, [])

  const boardsQuery = useQuery({
    queryKey: projectKeys.boards,
    queryFn: projectApi.listBoards,
  })

  const boards = boardsQuery.data ?? []
  const selectedBoardId = activeBoardId ?? boards[0]?.id ?? null

  const boardQuery = useQuery({
    queryKey: projectKeys.board(selectedBoardId),
    queryFn: () => projectApi.getBoard(selectedBoardId!),
    enabled: Boolean(selectedBoardId),
  })

  const board = boardQuery.data
  const columns = useMemo(
    () => (board?.columns ?? []).toSorted((left, right) => left.sortOrder - right.sortOrder || left.createdAt.localeCompare(right.createdAt)),
    [board?.columns],
  )
  const milestones = useMemo(() => board?.milestones ?? [], [board?.milestones])
  const labels = useMemo(() => board?.labels ?? [], [board?.labels])

  const visibleColumns = useMemo(
    () => columns.map((column) => ({
      ...column,
      cards: column.cards
        .filter((card) => cardMatches(card, filters, today))
        .toSorted((left, right) => left.sortOrder - right.sortOrder || left.createdAt.localeCompare(right.createdAt)),
    })),
    [columns, filters, today],
  )

  const allBoardCards = useMemo(() => columns.flatMap((col) => col.cards), [columns])
  const doneColumnIds = useMemo(() => {
    const explicit = columns.filter((col) => isDoneColumnName(col.name)).map((col) => col.id)
    if (explicit.length > 0) return new Set(explicit)
    const last = columns[columns.length - 1]
    return last ? new Set([last.id]) : new Set<string>()
  }, [columns])

  const activeMilestone = useMemo(() => {
    if (filters.milestoneId) {
      return milestones.find((m) => m.id === filters.milestoneId) ?? milestones[0] ?? null
    }
    return milestones[0] ?? null
  }, [filters.milestoneId, milestones])

  const milestoneProgress = useMemo(() => {
    if (!activeMilestone) return null
    const assigned = allBoardCards.filter((card) => card.milestoneId === activeMilestone.id)
    const done = assigned.filter((card) => doneColumnIds.has(card.columnId)).length
    const percent = assigned.length > 0 ? Math.round((done / assigned.length) * 100) : 0
    return { milestone: activeMilestone, total: assigned.length, done, percent }
  }, [activeMilestone, allBoardCards, doneColumnIds])

  const editingCard = useMemo(() => {
    if (cardEditor?.mode !== 'edit') return null
    return allBoardCards.find((card) => card.id === cardEditor.cardId) ?? null
  }, [allBoardCards, cardEditor])

  useEffect(() => {
    if (columnComposerOpen) columnInputRef.current?.focus()
  }, [columnComposerOpen])

  useEffect(() => {
    if (emptyBoardComposerOpen) newBoardInputRef.current?.focus()
  }, [emptyBoardComposerOpen])

  const refresh = async (boardId: string | null = selectedBoardId) => {
    await queryClient.invalidateQueries({ queryKey: projectKeys.boards })
    if (boardId) {
      await queryClient.invalidateQueries({ queryKey: projectKeys.board(boardId) })
    }
  }

  const createBoard = useMutation({
    mutationFn: (name: string) => projectApi.createBoard(name),
    onSuccess: async (created) => {
      setBoardName('')
      setEmptyBoardComposerOpen(false)
      setActiveBoardId(created.id)
      setFilters({ priority: '', deadline: '', milestoneId: '' })
      await refresh(created.id)
      toast.success('Project created.')
    },
    onError: () => toast.error('Could not create project.'),
  })

  const updateBoard = useMutation({
    mutationFn: ({ boardId, name }: { boardId: string; name: string }) => projectApi.updateBoard(boardId, name),
    onSuccess: async (updated) => {
      await refresh(updated.id)
      toast.success('Project renamed.')
    },
    onError: () => toast.error('Could not rename project.'),
  })

  const deleteBoard = useMutation({
    mutationFn: (boardId: string) => projectApi.deleteBoard(boardId),
    onSuccess: async (_, boardId) => {
      const nextBoardId = selectedBoardId === boardId
        ? boards.find((item) => item.id !== boardId)?.id ?? null
        : selectedBoardId
      setDeletingBoard(null)
      if (selectedBoardId === boardId) {
        setActiveBoardId(nextBoardId)
        setFilters({ priority: '', deadline: '', milestoneId: '' })
      }
      await refresh(nextBoardId)
      toast.success('Project deleted.')
    },
    onError: () => toast.error('Could not delete project.'),
  })

  const createColumn = useMutation({
    mutationFn: ({ boardId, name }: { boardId: string; name: string }) => projectApi.createColumn(boardId, name),
    onSuccess: async (_, { boardId }) => {
      setColumnName('')
      setColumnComposerOpen(false)
      await refresh(boardId)
      toast.success('Column created.')
    },
    onError: () => toast.error('Could not create column.'),
  })

  const updateColumn = useMutation({
    mutationFn: ({ boardId, columnId, patch }: { boardId: string; columnId: string; patch: { name?: string; sortOrder?: number } }) =>
      projectApi.updateColumn(boardId, columnId, patch),
    onSuccess: async (_, { boardId }) => {
      await refresh(boardId)
    },
    onError: () => toast.error('Could not update column.'),
  })

  const deleteColumn = useMutation({
    mutationFn: ({ boardId, columnId }: { boardId: string; columnId: string }) => projectApi.deleteColumn(boardId, columnId),
    onSuccess: async (_, { boardId }) => {
      await refresh(boardId)
      toast.success('Column deleted.')
    },
    onError: (error) => {
      const errorData = (error as { response?: { data?: { error?: { code?: string } } } }).response?.data?.error
      if (errorData?.code === 'PROJECT_COLUMN_NOT_EMPTY' || errorData?.code === 'COLUMN_NOT_EMPTY') {
        toast.error('Remove all cards from the column before deleting it.')
        return
      }
      toast.error('Could not delete column.')
    },
  })

  const createCard = useMutation({
    mutationFn: ({ boardId, input }: { boardId: string; input: projectApi.CreateProjectCardInput }) =>
      projectApi.createCard(boardId, input),
    onSuccess: async (_, { boardId }) => {
      setCardEditor(null)
      await refresh(boardId)
      toast.success('Card created.')
    },
    onError: () => toast.error('Could not create card.'),
  })

  const updateCard = useMutation({
    mutationFn: async ({
      cardId,
      patch,
      moveToColumnId,
      targetSortOrder,
    }: {
      boardId: string
      cardId: string
      patch: projectApi.UpdateProjectCardInput
      moveToColumnId?: string
      targetSortOrder?: number
    }) => {
      await projectApi.updateCard(cardId, patch)
      if (moveToColumnId !== undefined) {
        await projectApi.moveCard(cardId, moveToColumnId, targetSortOrder ?? 0)
      }
    },
    onSuccess: async (_, { boardId }) => {
      setCardEditor(null)
      await refresh(boardId)
      toast.success('Card updated.')
    },
    onError: () => toast.error('Could not update card.'),
  })

  const deleteCard = useMutation({
    mutationFn: ({ cardId }: { boardId: string; cardId: string }) => projectApi.deleteCard(cardId),
    onSuccess: async (_, { boardId }) => {
      setCardEditor(null)
      await refresh(boardId)
      toast.success('Card deleted.')
    },
    onError: () => toast.error('Could not delete card.'),
  })

  const moveCard = useMutation({
    mutationFn: ({ id, columnId, sortOrder }: { id: string; columnId: string; sortOrder: number }) =>
      projectApi.moveCard(id, columnId, sortOrder),
    onSuccess: async () => {
      await refresh()
    },
    onError: () => toast.error('Could not move card.'),
  })

  const createMilestoneMutation = useMutation({
    mutationFn: ({ boardId, name }: { boardId: string; name: string }) => projectApi.createMilestone(boardId, name),
    onSuccess: async (_, { boardId }) => {
      await refresh(boardId)
    },
    onError: () => toast.error('Could not create milestone.'),
  })

  const updateMilestoneMutation = useMutation({
    mutationFn: ({ boardId, milestoneId, name }: { boardId: string; milestoneId: string; name: string }) =>
      projectApi.updateMilestone(boardId, milestoneId, { name }),
    onSuccess: async (_, { boardId }) => {
      await refresh(boardId)
    },
    onError: () => toast.error('Could not update milestone.'),
  })

  const deleteMilestoneMutation = useMutation({
    mutationFn: ({ boardId, milestoneId }: { boardId: string; milestoneId: string }) =>
      projectApi.deleteMilestone(boardId, milestoneId),
    onSuccess: async (_, { boardId, milestoneId }) => {
      if (filters.milestoneId === milestoneId) {
        setFilters((current) => ({ ...current, milestoneId: '' }))
      }
      await refresh(boardId)
    },
    onError: () => toast.error('Could not delete milestone.'),
  })

  const createLabelMutation = useMutation({
    mutationFn: ({ boardId, name, tone }: { boardId: string; name: string; tone: projectApi.ProjectLabelTone }) =>
      projectApi.createLabel(boardId, { name, tone }),
    onSuccess: async (_, { boardId }) => {
      await refresh(boardId)
    },
    onError: () => toast.error('Could not create label.'),
  })

  const createChecklistMutation = useMutation({
    mutationFn: ({ cardId, title }: { cardId: string; title: string }) =>
      projectApi.createChecklistItem(cardId, title),
    onSuccess: async () => {
      await refresh()
    },
    onError: () => toast.error('Could not add checklist item.'),
  })

  const updateChecklistMutation = useMutation({
    mutationFn: ({ cardId, itemId, isCompleted }: { cardId: string; itemId: string; isCompleted: boolean }) =>
      projectApi.updateChecklistItem(cardId, itemId, { isCompleted }),
    onSuccess: async () => {
      await refresh()
    },
    onError: () => toast.error('Could not update checklist item.'),
  })

  const deleteChecklistMutation = useMutation({
    mutationFn: ({ cardId, itemId }: { cardId: string; itemId: string }) =>
      projectApi.deleteChecklistItem(cardId, itemId),
    onSuccess: async () => {
      await refresh()
    },
    onError: () => toast.error('Could not delete checklist item.'),
  })

  function submitEmptyBoard(event: FormEvent) {
    event.preventDefault()
    if (!boardName.trim() || createBoard.isPending) return
    createBoard.mutate(boardName.trim())
  }

  function submitColumn(event: FormEvent) {
    event.preventDefault()
    if (!selectedBoardId || !columnName.trim() || createColumn.isPending) return
    createColumn.mutate({ boardId: selectedBoardId, name: columnName.trim() })
  }

  function openCreateEditor(boardId: string, columnId: string, trigger: HTMLElement) {
    editorTriggerRef.current = trigger
    setCardForm(emptyCardForm(columnId))
    setCardEditor({ mode: 'create', boardId, columnId })
  }

  function openEditEditor(boardId: string, card: projectApi.ProjectCard, trigger: HTMLElement) {
    editorTriggerRef.current = trigger
    setCardForm({
      columnId: card.columnId,
      title: card.title,
      description: card.description ?? '',
      priority: card.priority,
      deadline: card.deadline ? card.deadline.slice(0, 10) : '',
      milestoneId: card.milestoneId ?? null,
      labelId: card.labelId ?? null,
      initialChecklistTitles: [],
    })
    setCardEditor({ mode: 'edit', boardId, cardId: card.id })
  }

  function submitCard() {
    if (!cardEditor || !cardForm.title.trim()) return

    if (cardEditor.mode === 'create') {
      createCard.mutate({
        boardId: cardEditor.boardId,
        input: {
          columnId: cardForm.columnId || cardEditor.columnId,
          title: cardForm.title.trim(),
          description: cardForm.description.trim() || null,
          priority: cardForm.priority,
          deadline: cardForm.deadline || null,
          milestoneId: cardForm.milestoneId,
          labelId: cardForm.labelId,
          checklistTitles: cardForm.initialChecklistTitles.length > 0 ? cardForm.initialChecklistTitles : undefined,
        },
      })
      return
    }

    const originalColumnId = editingCard?.columnId
    const moved = Boolean(originalColumnId && cardForm.columnId && cardForm.columnId !== originalColumnId)
    const targetColumn = moved ? columns.find((col) => col.id === cardForm.columnId) : undefined

    updateCard.mutate({
      boardId: cardEditor.boardId,
      cardId: cardEditor.cardId,
      patch: {
        title: cardForm.title.trim(),
        description: cardForm.description.trim(),
        priority: cardForm.priority,
        deadline: cardForm.deadline,
        milestoneId: cardForm.milestoneId,
        labelId: cardForm.labelId,
      },
      moveToColumnId: moved ? cardForm.columnId : undefined,
      targetSortOrder: targetColumn?.cards.length ?? 0,
    })
  }

  function handleDrop(event: DragEvent, columnId: string) {
    event.preventDefault()
    if (!draggedCardId) return
    const card = allBoardCards.find((item) => item.id === draggedCardId)
    if (!card || card.columnId === columnId) {
      setDraggedCardId(null)
      return
    }
    const targetColumn = columns.find((column) => column.id === columnId)
    moveCard.mutate({ id: card.id, columnId, sortOrder: targetColumn?.cards.length ?? 0 })
    setDraggedCardId(null)
  }

  const cardMutationPending = createCard.isPending || updateCard.isPending || deleteCard.isPending
  const hasActiveFilters = Boolean(filters.priority || filters.deadline || filters.milestoneId)
  const activeBoardTitle = board?.name ?? boards.find((b) => b.id === selectedBoardId)?.name ?? (boardsQuery.isLoading ? 'Loading project...' : 'Project')

  return (
    <div className="project-workspace-shell" data-testid="project-page">
      <div className="project-content" data-testid="project-route-workspace">
        {boards.length > 0 ? (
          <>
            {/* Row 1: Board Switcher */}
            <header className="project-topbar-row">
              <ProjectBoardSwitcher
                boards={boards}
                selectedBoardId={selectedBoardId}
                activeBoardName={activeBoardTitle}
                creating={createBoard.isPending}
                onSelectBoard={(id) => {
                  setActiveBoardId(id)
                  setFilters({ priority: '', deadline: '', milestoneId: '' })
                }}
                onCreateBoard={async (name) => {
                  await createBoard.mutateAsync(name).catch(() => undefined)
                }}
                onRenameBoard={async (boardId, name) => {
                  await updateBoard.mutateAsync({ boardId, name }).catch(() => undefined)
                }}
                onRequestDeleteBoard={setDeletingBoard}
              />
            </header>

            {/* Row 2: Filters + Add Column + Milestone Progress Pill */}
            <section className="project-toolbar-row" aria-label="Project toolbar">
              <div className="project-toolbar-left" aria-label="Project card filters">
                <SelectMenu
                  className="project-filter-select"
                  buttonClassName="project-filter-pill"
                  aria-label="Filter by priority"
                  value={filters.priority}
                  onChange={(priority) => setFilters((current) => ({ ...current, priority }))}
                  options={[
                    { value: '', label: 'All priorities' },
                    ...projectPriorities.map((priority) => ({ value: priority, label: priority })),
                  ]}
                />

                <SelectMenu
                  className="project-filter-select"
                  buttonClassName="project-filter-pill"
                  aria-label="Filter by deadline"
                  value={filters.deadline}
                  onChange={(deadline) => setFilters((current) => ({ ...current, deadline }))}
                  options={[
                    { value: '', label: 'All deadlines' },
                    { value: 'has', label: 'Has deadline' },
                    { value: 'overdue', label: 'Overdue' },
                    { value: 'week', label: 'Due this week' },
                  ]}
                />

                <SelectMenu
                  className="project-filter-select"
                  buttonClassName="project-filter-pill"
                  aria-label="Filter by milestone"
                  value={filters.milestoneId}
                  onChange={(milestoneId) => setFilters((current) => ({ ...current, milestoneId }))}
                  options={[
                    { value: '', label: 'All milestones' },
                    ...milestones.map((m) => ({ value: m.id, label: m.name })),
                  ]}
                />

                <button
                  type="button"
                  className="project-add-column-btn"
                  disabled={!selectedBoardId}
                  onClick={() => {
                    setColumnName('')
                    setColumnComposerOpen(true)
                  }}
                >
                  + Add Column
                </button>

                {hasActiveFilters ? (
                  <button
                    type="button"
                    className="project-clear-filters-btn"
                    onClick={() => setFilters({ priority: '', deadline: '', milestoneId: '' })}
                  >
                    Clear filters
                  </button>
                ) : null}
              </div>

              <div className="project-toolbar-right">
                {milestoneProgress ? (
                  <button
                    type="button"
                    className="project-milestone-pill"
                    data-testid="project-milestone-progress"
                    aria-label={`Manage milestones (${milestoneProgress.milestone.name}: ${milestoneProgress.percent}%)`}
                    onClick={() => setMilestoneDialogOpen(true)}
                  >
                    <span className="project-milestone-pill__name">{milestoneProgress.milestone.name}</span>
                    <span className="project-milestone-pill__track" aria-hidden="true">
                      <span
                        className="project-milestone-pill__fill"
                        style={{ width: `${milestoneProgress.percent}%` }}
                      />
                    </span>
                    <span className="project-milestone-pill__pct">{milestoneProgress.percent}%</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="project-milestone-pill project-milestone-pill--empty"
                    disabled={!selectedBoardId}
                    onClick={() => setMilestoneDialogOpen(true)}
                  >
                    + Add Milestone
                  </button>
                )}
              </div>
            </section>
          </>
        ) : null}

        {/* Row 3: Kanban Columns */}
        <div className="project-board-container" aria-label="Project board" data-testid="project-board-surface">
          {selectedBoardId && boardQuery.isLoading ? (
            <p className="project-board-loading" role="status">Loading project board...</p>
          ) : null}

          {!selectedBoardId && !boardsQuery.isLoading ? (
            <div className="empty-panel project-empty" role="status">
              <div className="project-empty-icon" aria-hidden="true">
                <FolderPlus />
              </div>
              <h2>No projects</h2>
              <p>Get started by creating a new project.</p>
              {emptyBoardComposerOpen ? (
                <form className="project-empty-form" onSubmit={submitEmptyBoard}>
                  <label htmlFor="project-empty-project">Project name</label>
                  <input
                    ref={newBoardInputRef}
                    id="project-empty-project"
                    value={boardName}
                    onChange={(event) => setBoardName(event.target.value)}
                    placeholder="Project name"
                    data-testid="project-empty-project-input"
                    maxLength={180}
                    autoFocus
                  />
                  <div className="project-empty-form-actions">
                    <button
                      type="button"
                      className="project-secondary-btn"
                      onClick={() => { setBoardName(''); setEmptyBoardComposerOpen(false) }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="project-primary-btn"
                      disabled={!boardName.trim() || createBoard.isPending}
                    >
                      {createBoard.isPending ? 'Creating...' : 'Create Project'}
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  className="project-empty-create-button"
                  data-testid="project-empty-new-project"
                  onClick={() => {
                    setEmptyBoardComposerOpen(true)
                    window.requestAnimationFrame(() => newBoardInputRef.current?.focus())
                  }}
                >
                  <Plus aria-hidden="true" />
                  <span>New Project</span>
                </button>
              )}
            </div>
          ) : null}

          {board ? (
            <div className="project-columns-scroll" data-testid="project-columns">
              {visibleColumns.map((column) => {
                const isDoneCol = doneColumnIds.has(column.id) && isDoneColumnName(column.name)
                return (
                  <section
                    className="project-column"
                    key={column.id}
                    data-testid={`project-column-${column.name}`}
                    aria-label={`${column.name} column`}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => handleDrop(event, column.id)}
                  >
                    <header className="project-column__header">
                      <input
                        className="project-column__title-input"
                        aria-label={`Rename column ${column.name}`}
                        defaultValue={column.name}
                        maxLength={180}
                        onBlur={(event) => {
                          const name = event.target.value.trim()
                          if (name && name !== column.name) {
                            updateColumn.mutate({ boardId: board.id, columnId: column.id, patch: { name } })
                          }
                        }}
                      />

                      <div className="project-column__header-right">
                        <button
                          type="button"
                          className="project-column__icon-btn project-column__icon-btn--danger"
                          aria-label={`Delete column ${column.name}`}
                          onClick={() => setDeletingColumn({ boardId: board.id, columnId: column.id, name: column.name })}
                        >
                          <Trash2 aria-hidden="true" />
                        </button>
                        <span className="project-column__count" aria-label={`${column.cards.length} cards`}>
                          {column.cards.length}
                        </span>
                      </div>
                    </header>

                    <div className="project-column__cards">
                      {column.cards.map((card) => {
                        const isSelected = cardEditor?.mode === 'edit' && cardEditor.cardId === card.id
                        const checklist = card.checklistItems ?? []
                        const doneItems = checklist.filter((item) => item.isCompleted).length
                        const dateLabel = formatCardDate(card.deadline, isDoneCol, today)
                        const badgeText = card.label?.name ?? card.priority
                        const badgeTone = card.label?.tone ?? priorityFallbackTone(card.priority)

                        return (
                          <article
                            key={card.id}
                            draggable
                            onDragStart={() => setDraggedCardId(card.id)}
                            onDragEnd={() => setDraggedCardId(null)}
                            data-testid={`project-card-${card.title}`}
                            className={`project-kanban-card${isSelected ? ' project-kanban-card--selected' : ''}`}
                          >
                            <button
                              type="button"
                              className="project-kanban-card__btn"
                              data-testid={`project-card-edit-${card.id}`}
                              aria-label={`Edit ${card.title}`}
                              onClick={(event) => openEditEditor(board.id, card, event.currentTarget)}
                            >
                              <span className="project-kanban-card__title">{card.title}</span>
                              <div className="project-kanban-card__footer">
                                <span className={`project-badge project-badge--${badgeTone}`}>
                                  {badgeText}
                                </span>

                                <div className="project-kanban-card__meta">
                                  {checklist.length > 0 ? (
                                    <span className="project-kanban-card__checklist">
                                      <CheckSquare aria-hidden="true" />
                                      <span>{doneItems}/{checklist.length}</span>
                                    </span>
                                  ) : null}
                                  {dateLabel ? (
                                    <span className="project-kanban-card__date">{dateLabel}</span>
                                  ) : null}
                                </div>
                              </div>
                            </button>
                          </article>
                        )
                      })}

                      {column.cards.length === 0 ? (
                        <div className="project-column__empty" role="status">
                          <strong>{hasActiveFilters ? 'No matching cards' : 'No cards yet'}</strong>
                          <span>{hasActiveFilters ? 'Try another filter.' : 'Add a card below.'}</span>
                        </div>
                      ) : null}

                      <button
                        type="button"
                        className="project-column__add-card"
                        onClick={(event) => openCreateEditor(board.id, column.id, event.currentTarget)}
                      >
                        <Plus aria-hidden="true" />
                        <span>Add Card</span>
                      </button>
                    </div>
                  </section>
                )
              })}
            </div>
          ) : null}
        </div>

        {/* Add Column Dialog */}
        <Dialog open={columnComposerOpen} onOpenChange={(open) => { if (!open) { setColumnName(''); setColumnComposerOpen(false) } }}>
          <DialogContent>
            <DialogTitle>Add Column</DialogTitle>
            <form onSubmit={submitColumn}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label htmlFor="project-new-column" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ds-foreground)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  Column Name
                  <input
                    ref={columnInputRef}
                    id="project-new-column"
                    value={columnName}
                    onChange={(event) => setColumnName(event.target.value)}
                    placeholder="Enter column name"
                    data-testid="project-column-name-input"
                    maxLength={180}
                    autoFocus
                    required
                    style={{ minHeight: 40, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--ds-border)', background: 'var(--ds-background)', color: 'var(--ds-foreground)', fontSize: 14, outline: 'none', width: '100%' }}
                  />
                </label>
              </div>
              <DialogFooter style={{ marginTop: 20 }}>
                <button type="button" className="project-secondary-btn" onClick={() => { setColumnName(''); setColumnComposerOpen(false) }}>Cancel</button>
                <button type="submit" className="project-primary-btn" disabled={!columnName.trim() || createColumn.isPending}>
                  {createColumn.isPending ? 'Adding...' : 'Confirm'}
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Manage Milestones Dialog */}
        {selectedBoardId ? (
          <ProjectMilestoneDialog
            open={milestoneDialogOpen}
            milestones={milestones}
            pending={createMilestoneMutation.isPending || updateMilestoneMutation.isPending || deleteMilestoneMutation.isPending}
            onOpenChange={setMilestoneDialogOpen}
            onCreateMilestone={async (name) => {
              await createMilestoneMutation.mutateAsync({ boardId: selectedBoardId, name }).catch(() => undefined)
            }}
            onRenameMilestone={async (milestoneId, name) => {
              await updateMilestoneMutation.mutateAsync({ boardId: selectedBoardId, milestoneId, name }).catch(() => undefined)
            }}
            onDeleteMilestone={async (milestoneId) => {
              await deleteMilestoneMutation.mutateAsync({ boardId: selectedBoardId, milestoneId }).catch(() => undefined)
            }}
          />
        ) : null}

        {/* Delete Project AlertDialog */}
        <AlertDialog open={!!deletingBoard} onOpenChange={(open) => { if (!open && !deleteBoard.isPending) setDeletingBoard(null) }}>
          <AlertDialogContent>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>"{deletingBoard?.name}"</strong>? It will no longer appear in your workspace.
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancelButton disabled={deleteBoard.isPending}>Cancel</AlertDialogCancelButton>
              <AlertDialogActionButton
                disabled={deleteBoard.isPending}
                onClick={(e) => { e.preventDefault(); if (deletingBoard) deleteBoard.mutate(deletingBoard.id) }}
              >
                {deleteBoard.isPending ? 'Deleting...' : 'Delete'}
              </AlertDialogActionButton>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Card Editor Right Slide-Over Sheet */}
        <Dialog open={!!cardEditor} onOpenChange={(open) => { if (!open && !deletingCard) closeEditor() }}>
          <DialogContent
            aria-label="Card details"
            className="left-auto right-0 top-0 bottom-0 h-dvh w-full max-w-[500px] translate-x-0 translate-y-0 rounded-none border-0 bg-transparent p-0 shadow-none"
            aria-describedby={undefined}
            onEscapeKeyDown={(event) => { if (deletingCard) event.preventDefault() }}
          >
            <ProjectCardDetailPanel
              mode={cardEditor?.mode ?? 'create'}
              editorKey={cardEditor ? (cardEditor.mode === 'create' ? `create-${cardEditor.columnId}` : `edit-${cardEditor.cardId}`) : 'none'}
              form={cardForm}
              columns={columns}
              milestones={milestones}
              labels={labels}
              checklistItems={editingCard?.checklistItems ?? []}
              pending={cardMutationPending}
              suspendEscape={Boolean(deletingCard)}
              onChange={setCardForm}
              onSubmit={submitCard}
              onClose={closeEditor}
              onCreateMilestone={async (name) => {
                if (!selectedBoardId) return null
                try {
                  return await createMilestoneMutation.mutateAsync({ boardId: selectedBoardId, name })
                } catch {
                  return null
                }
              }}
              onCreateLabel={async (name, tone) => {
                if (!selectedBoardId) return null
                try {
                  return await createLabelMutation.mutateAsync({ boardId: selectedBoardId, name, tone })
                } catch {
                  return null
                }
              }}
              onAddChecklistItem={async (title) => {
                if (!editingCard) return
                await createChecklistMutation.mutateAsync({ cardId: editingCard.id, title }).catch(() => undefined)
              }}
              onToggleChecklistItem={async (item) => {
                if (!editingCard) return
                await updateChecklistMutation.mutateAsync({
                  cardId: editingCard.id,
                  itemId: item.id,
                  isCompleted: !item.isCompleted,
                }).catch(() => undefined)
              }}
              onDeleteChecklistItem={async (itemId) => {
                if (!editingCard) return
                await deleteChecklistMutation.mutateAsync({ cardId: editingCard.id, itemId }).catch(() => undefined)
              }}
              onDelete={editingCard && cardEditor?.mode === 'edit'
                ? () => setDeletingCard({ boardId: cardEditor.boardId, cardId: editingCard.id, title: editingCard.title })
                : undefined}
            />
          </DialogContent>
        </Dialog>

        {/* Delete Column AlertDialog */}
        <AlertDialog open={!!deletingColumn} onOpenChange={(open) => { if (!open && !deleteColumn.isPending) setDeletingColumn(null) }}>
          <AlertDialogContent>
            <AlertDialogTitle>Delete Column</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete column <strong>"{deletingColumn?.name}"</strong>? All cards inside will also be removed.
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancelButton disabled={deleteColumn.isPending}>Cancel</AlertDialogCancelButton>
              <AlertDialogActionButton
                disabled={deleteColumn.isPending}
                onClick={(e) => { e.preventDefault(); if (deletingColumn) { deleteColumn.mutate({ boardId: deletingColumn.boardId, columnId: deletingColumn.columnId }); setDeletingColumn(null) } }}
              >
                {deleteColumn.isPending ? 'Deleting...' : 'Delete'}
              </AlertDialogActionButton>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Card AlertDialog */}
        <AlertDialog open={!!deletingCard} onOpenChange={(open) => { if (!open && !deleteCard.isPending) setDeletingCard(null) }}>
          <AlertDialogContent>
            <AlertDialogTitle>Delete Card</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>"{deletingCard?.title}"</strong>? This action cannot be undone.
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancelButton disabled={deleteCard.isPending}>Cancel</AlertDialogCancelButton>
              <AlertDialogActionButton
                disabled={deleteCard.isPending}
                onClick={(e) => { e.preventDefault(); if (deletingCard) { deleteCard.mutate({ boardId: deletingCard.boardId, cardId: deletingCard.cardId }); setDeletingCard(null) } }}
              >
                {deleteCard.isPending ? 'Deleting...' : 'Delete'}
              </AlertDialogActionButton>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {(boardQuery.isError || boardsQuery.isError) ? (
        <p className="status-message status-message--error project-status-notice" role="alert">
          Could not load Project data.
        </p>
      ) : null}
    </div>
  )
}
