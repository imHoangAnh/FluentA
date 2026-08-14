import {
  CalendarDays,
  CircleCheckBig,
  CircleDashed,
  Clock3,
  FolderPlus,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { type DragEvent, type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as ContextMenu from '@radix-ui/react-context-menu'
import { contextMenuContentClassName, contextMenuItemClassName } from '@/shared/components/ui/context-menu-styles'
import { AlertDialog, AlertDialogActionButton, AlertDialogCancelButton, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from '@/shared/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog'
import { SelectMenu } from '@/shared/components/ui/select-menu'
import { ProjectCardDetailPanel } from '../components/ProjectCardDetailPanel'
import { type ProjectCardForm, projectPriorities } from '../components/project-card-editor'
import * as projectApi from '../api/project.api'
import { projectKeys } from '../api/project.queries'
import { restoreTrashEntry } from '@/features/trash'
import { toast } from '@/shared/lib/toast'

const today = new Date()
const todayInput = `${today.getFullYear()}-${`${today.getMonth() + 1}`.padStart(2, '0')}-${`${today.getDate()}`.padStart(2, '0')}`

type CardEditor =
  | { mode: 'create'; boardId: string; columnId: string }
  | { mode: 'edit'; boardId: string; card: projectApi.ProjectCard }

function getTomorrowDateInput(): string {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const year = tomorrow.getFullYear()
  const month = `${tomorrow.getMonth() + 1}`.padStart(2, '0')
  const day = `${tomorrow.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function deadlineState(deadline?: string | null) {
  if (!deadline) return 'none'
  const dateOnly = deadline.includes('T') ? deadline.split('T')[0] : deadline
  if (dateOnly! < todayInput) return 'overdue'
  const deadlineDate = new Date(`${dateOnly}T00:00:00`)
  const weekEnd = new Date()
  weekEnd.setDate(weekEnd.getDate() + 7)
  return deadlineDate <= weekEnd ? 'this-week' : 'later'
}

function cardMatches(card: projectApi.ProjectCard, filters: { priority: string; deadline: string }) {
  if (filters.priority && card.priority !== filters.priority) return false
  if (filters.deadline === 'has' && !card.deadline) return false
  if (filters.deadline === 'overdue' && deadlineState(card.deadline) !== 'overdue') return false
  if (filters.deadline === 'week' && deadlineState(card.deadline) !== 'this-week') return false
  return true
}

function emptyCardForm(columnId = ''): ProjectCardForm {
  return {
    columnId,
    title: '',
    description: '',
    priority: 'Medium',
    deadline: getTomorrowDateInput(),
  }
}

function ColumnStatusIcon({ name }: { name: string }) {
  const normalizedName = name.trim().toLowerCase()

  if (normalizedName.includes('done') || normalizedName.includes('complete')) {
    return <CircleCheckBig aria-hidden="true" />
  }

  if (normalizedName.includes('progress') || normalizedName.includes('doing')) {
    return <Clock3 aria-hidden="true" />
  }

  return <CircleDashed aria-hidden="true" />
}

export function ProjectPage() {
  const queryClient = useQueryClient()
  const [boardName, setBoardName] = useState('')
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null)
  const [columnName, setColumnName] = useState('')
  const [columnComposerOpen, setColumnComposerOpen] = useState(false)
  const [cardEditor, setCardEditor] = useState<CardEditor | null>(null)
  const [cardForm, setCardForm] = useState<ProjectCardForm>(() => emptyCardForm())
  const [filters, setFilters] = useState({ priority: '', deadline: '' })
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [editingBoardId, setEditingBoardId] = useState<string | null>(null)
  const [editingBoardName, setEditingBoardName] = useState('')
  const [deletingBoard, setDeletingBoard] = useState<projectApi.ProjectBoardSummary | null>(null)
  const [deletingColumn, setDeletingColumn] = useState<{ boardId: string; columnId: string; name: string } | null>(null)
  const [deletingCard, setDeletingCard] = useState<{ boardId: string; cardId: string; title: string } | null>(null)
  const [emptyBoardComposerOpen, setEmptyBoardComposerOpen] = useState(false)
  const editorTriggerRef = useRef<HTMLElement | null>(null)
  const boardDeletePendingRef = useRef(false)
  const boardTabRefs = useRef(new Map<string, HTMLButtonElement>())
  const newBoardInputRef = useRef<HTMLInputElement>(null)
  const columnInputRef = useRef<HTMLInputElement>(null)
  const editingBoardInputRef = useRef<HTMLInputElement>(null)

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
  const visibleColumns = useMemo(
    () => columns.map((column) => ({
      ...column,
      cards: column.cards
        .filter((card) => cardMatches(card, filters))
        .toSorted((left, right) => left.sortOrder - right.sortOrder || left.createdAt.localeCompare(right.createdAt)),
    })),
    [columns, filters],
  )

  useEffect(() => {
    if (columnComposerOpen) columnInputRef.current?.focus()
  }, [columnComposerOpen])

  useEffect(() => {
    if (editingBoardId) editingBoardInputRef.current?.focus()
  }, [editingBoardId])

  const refresh = async (boardId: string | null = selectedBoardId) => {
    await queryClient.invalidateQueries({ queryKey: projectKeys.boards })
    if (boardId) {
      await queryClient.invalidateQueries({ queryKey: projectKeys.board(boardId) })
    }
  }

  const createBoard = useMutation({
    mutationFn: projectApi.createBoard,
    onSuccess: async (created) => {
      setBoardName('')
      setEmptyBoardComposerOpen(false)
      setActiveBoardId(created.id)
      await refresh(created.id)
      toast.success('Project created.')
    },
    onError: () => toast.error('Could not create project.'),
  })

  const updateBoard = useMutation({
    mutationFn: ({ boardId, name }: { boardId: string; name: string }) => projectApi.updateBoard(boardId, name),
    onSuccess: async (updated) => {
      setEditingBoardId(null)
      await refresh(updated.id)
      toast.success('Project renamed.')
    },
    onError: () => toast.error('Could not rename project.'),
  })

  const deleteBoard = useMutation({
    mutationFn: (boardId: string) => projectApi.deleteBoard(boardId),
    onSuccess: async (entry, boardId) => {
      const nextBoardId = selectedBoardId === boardId
        ? boards.find((item) => item.id !== boardId)?.id ?? null
        : selectedBoardId

      setMessage(null)
      setDeletingBoard(null)
      if (selectedBoardId === boardId) setActiveBoardId(nextBoardId)
      await refresh(nextBoardId)
      window.requestAnimationFrame(() => {
        if (nextBoardId) boardTabRefs.current.get(nextBoardId)?.focus()
        else newBoardInputRef.current?.focus()
      })
      toast.success('Project moved to Trash.', { action: { label: 'Undo', onClick: () => undo(entry.id, nextBoardId) } })
    },
    onError: () => {
      boardDeletePendingRef.current = false
      toast.error('Could not delete project.')
    },
    onSettled: () => {
      boardDeletePendingRef.current = false
    },
  })

  const undo = async (entryId: string, activeId: string | null) => {
    try {
      await restoreTrashEntry(entryId)
      await refresh(activeId)
      if (activeId) setActiveBoardId(activeId)
      toast.success('Item restored.')
    } catch {
      toast.error('Could not restore the item.')
    }
  }

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
    onSuccess: async (entry, { boardId }) => {
      await refresh(boardId)
      toast.success('Column moved to Trash.', { action: { label: 'Undo', onClick: () => undo(entry.id, boardId) } })
    },
    onError: (error) => {
      const errorData = (error as { response?: { data?: { error?: { code?: string } } } }).response?.data?.error
      if (errorData?.code === 'COLUMN_NOT_EMPTY') {
        toast.error('Remove all cards from the column before deleting it.')
        return
      }
      toast.error('Could not delete column.')
    },
  })

  const createCard = useMutation({
    mutationFn: ({ boardId, input }: { boardId: string; input: projectApi.CreateProjectCardInput }) => projectApi.createCard(boardId, input),
    onSuccess: async (_, { boardId }) => {
      setCardEditor(null)
      await refresh(boardId)
      toast.success('Card created.')
    },
    onError: () => toast.error('Could not create card.'),
  })

  const updateCard = useMutation({
    mutationFn: ({ cardId, patch }: { boardId: string; cardId: string; patch: projectApi.UpdateProjectCardInput }) =>
      projectApi.updateCard(cardId, patch),
    onSuccess: async (_, { boardId }) => {
      setCardEditor(null)
      await refresh(boardId)
      toast.success('Card updated.')
    },
    onError: () => toast.error('Could not update card.'),
  })

  const deleteCard = useMutation({
    mutationFn: ({ cardId }: { boardId: string; cardId: string }) => projectApi.deleteCard(cardId),
    onSuccess: async (entry, { boardId }) => {
      setCardEditor(null)
      await refresh(boardId)
      toast.success('Card moved to Trash.', { action: { label: 'Undo', onClick: () => undo(entry.id, boardId) } })
    },
    onError: () => toast.error('Could not delete card.'),
  })

  const moveCard = useMutation({
    mutationFn: ({ id, columnId, sortOrder }: { id: string; columnId: string; sortOrder: number }) => projectApi.moveCard(id, columnId, sortOrder),
    onSuccess: async () => {
      await refresh()
    },
    onError: () => toast.error('Could not move card.'),
  })

  function selectBoard(id: string) {
    setActiveBoardId(id)
    setMessage(null)
  }

  function submitBoard(event: FormEvent) {
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
      deadline: card.deadline || getTomorrowDateInput(),
    })
    setCardEditor({ mode: 'edit', boardId, card })
  }

  function submitCard() {
    if (!cardEditor || !cardForm.title.trim()) return

    if (cardEditor.mode === 'create') {
      createCard.mutate({
        boardId: cardEditor.boardId,
        input: {
          columnId: cardEditor.columnId,
          title: cardForm.title.trim(),
          description: cardForm.description.trim() || null,
          priority: cardForm.priority,
          deadline: cardForm.deadline || null,
        },
      })
      return
    }

    updateCard.mutate({
      boardId: cardEditor.boardId,
      cardId: cardEditor.card.id,
      patch: {
        title: cardForm.title.trim(),
        description: cardForm.description.trim(),
        priority: cardForm.priority,
        deadline: cardForm.deadline,
      },
    })
  }

  function handleDrop(event: DragEvent, columnId: string) {
    event.preventDefault()
    if (!draggedCardId) return
    const card = board?.columns.flatMap((col) => col.cards).find((item) => item.id === draggedCardId)
    if (!card) return
    moveCardToColumn(card, columnId)
    setDraggedCardId(null)
  }

  function moveCardToColumn(card: projectApi.ProjectCard, columnId: string) {
    if (columnId === card.columnId) return
    const targetColumn = columns.find((column) => column.id === columnId)
    moveCard.mutate({ id: card.id, columnId, sortOrder: targetColumn?.cards.length ?? 0 })
  }

  const cardMutationPending = createCard.isPending || updateCard.isPending || deleteCard.isPending
  const hasActiveFilters = Boolean(filters.priority || filters.deadline)

  return (
    <main className="project-main-wrapper" data-testid="project-page">
      <div className="project-workspace">
        <div className="project-content" data-testid="project-route-workspace">
          <nav className="project-board-tabs" aria-label="Project" data-testid="project-navigation">
            <span className="project-board-tabs__label">Project</span>
            {boardsQuery.isLoading ? <span className="project-loading-label">Loading projects...</span> : null}
            {boards.map((item) =>
              editingBoardId === item.id ? (
                <div
                  key={item.id}
                  className={`project-tab project-tab--active ${item.id === selectedBoardId ? 'project-tab--active' : ''}`}
                >
                  <input
                    ref={editingBoardInputRef}
                    className="project-tab-rename-input"
                    value={editingBoardName}
                    onChange={(event) => setEditingBoardName(event.target.value)}
                    onBlur={() => {
                      const trimmed = editingBoardName.trim()
                      if (trimmed && trimmed !== item.name) {
                        updateBoard.mutate({ boardId: item.id, name: trimmed })
                      } else {
                        setEditingBoardId(null)
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        const trimmed = editingBoardName.trim()
                        if (trimmed && trimmed !== item.name) {
                          updateBoard.mutate({ boardId: item.id, name: trimmed })
                        } else {
                          setEditingBoardId(null)
                        }
                      } else if (event.key === 'Escape') {
                        setEditingBoardId(null)
                      }
                    }}
                    autoFocus
                  />
                </div>
              ) : (
                <ContextMenu.Root key={item.id}>
                  <ContextMenu.Trigger asChild>
                    <button
                      ref={(element) => {
                        if (element) boardTabRefs.current.set(item.id, element)
                        else boardTabRefs.current.delete(item.id)
                      }}
                      type="button"
                      className={`project-tab ${item.id === selectedBoardId ? 'project-tab--active' : ''}`}
                      aria-current={item.id === selectedBoardId ? 'page' : undefined}
                      title="Right-click for options"
                      onClick={() => selectBoard(item.id)}
                    >
                      {item.name}
                    </button>
                  </ContextMenu.Trigger>
                  <ContextMenu.Portal>
                    <ContextMenu.Content className={contextMenuContentClassName} data-testid="project-board-context-menu">
                      <ContextMenu.Item
                        className={contextMenuItemClassName}
                        onSelect={() => {
                          setEditingBoardId(item.id)
                          setEditingBoardName(item.name)
                        }}
                      >
                        <Pencil className="size-4 mr-2" aria-hidden="true" />
                        <span>Rename</span>
                      </ContextMenu.Item>
                      <ContextMenu.Item
                        className={`${contextMenuItemClassName} text-red-600 dark:text-red-400`}
                        onSelect={() => setDeletingBoard(item)}
                      >
                        <Trash2 className="size-4 mr-2" aria-hidden="true" />
                        <span>Delete</span>
                      </ContextMenu.Item>
                    </ContextMenu.Content>
                  </ContextMenu.Portal>
                </ContextMenu.Root>
              ),
            )}

            {boards.length > 0 ? (
              <form className="project-new-board-form" onSubmit={submitBoard}>
                <Plus aria-hidden="true" />
                <label className="sr-only" htmlFor="project-new-project">New project name</label>
                <input
                  ref={newBoardInputRef}
                  id="project-new-project"
                  value={boardName}
                  onChange={(event) => setBoardName(event.target.value)}
                  placeholder="New project"
                  data-testid="project-board-name-input"
                  className="project-new-board-input"
                  maxLength={180}
                />
              </form>
            ) : null}
          </nav>

          <section className="project-header">
            <div className="project-title-area">
              <div>
                <h2>{board?.name ?? (boardsQuery.isLoading || boardQuery.isLoading ? 'Loading project...' : 'Project')}</h2>
              </div>
            </div>

            <div className="project-column-tools">
              <div className="project-filter-bar" aria-label="Project card filters">
                <SelectMenu
                  className="project-filter-control"
                  buttonClassName="min-h-[38px] rounded-lg border-[var(--ds-border)] px-3 py-2 text-sm font-medium"
                  aria-label="Filter by priority"
                  value={filters.priority}
                  onChange={(priority) => setFilters((current) => ({ ...current, priority }))}
                  options={[{ value: '', label: 'All priorities' }, ...projectPriorities.map((priority) => ({ value: priority, label: priority }))]}
                />
                <SelectMenu
                  className="project-filter-control"
                  buttonClassName="min-h-[38px] rounded-lg border-[var(--ds-border)] px-3 py-2 text-sm font-medium"
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
              </div>

              <button
                type="button"
                className="project-add-column-control"
                disabled={!selectedBoardId}
                onClick={() => {
                  setColumnName('')
                  setColumnComposerOpen(true)
                }}
              >
                <Plus aria-hidden="true" />
                <span>Add column</span>
              </button>
            </div>
          </section>

          <div className="project-board-container" aria-label="Project board" data-testid="project-board-surface">
            {selectedBoardId && boardQuery.isLoading ? <p className="project-board-loading" role="status">Loading project board...</p> : null}
            {!selectedBoardId && !boardsQuery.isLoading ? (
              <div className="empty-panel project-empty" role="status">
                <div className="project-empty-icon" aria-hidden="true">
                  <FolderPlus />
                </div>
                <h2>No projects</h2>
                <p>Get started by creating a new project.</p>
                {emptyBoardComposerOpen ? (
                  <form className="project-empty-form" onSubmit={submitBoard}>
                    <label htmlFor="project-empty-project">Project name</label>
                    <input
                      ref={newBoardInputRef}
                      id="project-empty-project"
                      value={boardName}
                      onChange={(event) => setBoardName(event.target.value)}
                      placeholder="Project name"
                      data-testid="project-empty-project-input"
                      maxLength={180}
                    />
                    <div className="project-empty-form-actions">
                      <button type="button" className="project-secondary-btn" onClick={() => { setBoardName(''); setEmptyBoardComposerOpen(false) }}>
                        Cancel
                      </button>
                      <button type="submit" className="project-primary-btn" disabled={!boardName.trim() || createBoard.isPending}>
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
                {visibleColumns.map((column) => (
                  <section
                    className="project-column-modern"
                    key={column.id}
                    data-testid={`project-column-${column.name}`}
                    aria-label={`${column.name} column`}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => handleDrop(event, column.id)}
                  >
                    <header className="project-column-header">
                      <div className="project-column-title">
                        <span className="project-column-icon"><ColumnStatusIcon name={column.name} /></span>
                        <input
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
                      </div>
                      <div className="project-column-actions">
                        <span className="project-column-count" aria-label={`${column.cards.length} cards`}>{column.cards.length}</span>
                        <button
                          className="project-column-menu"
                          type="button"
                          aria-label={`Delete column ${column.name}`}
                          onClick={() => setDeletingColumn({ boardId: board.id, columnId: column.id, name: column.name })}
                        >
                          <Trash2 aria-hidden="true" />
                        </button>
                      </div>
                    </header>

                    <button
                      type="button"
                      className="project-add-card-btn"
                      onClick={(event) => openCreateEditor(board.id, column.id, event.currentTarget)}
                    >
                      <Plus aria-hidden="true" />
                      Add Card
                    </button>

                    <div className="project-cards-list">
                      {column.cards.length === 0 ? (
                        <div className="project-column-empty" role="status">
                          <span className="project-column-empty__icon"><ColumnStatusIcon name={column.name} /></span>
                          <strong>{hasActiveFilters ? 'No matching cards' : 'No cards yet'}</strong>
                          <span>{hasActiveFilters ? 'Try another priority or deadline.' : 'Add a card to get started.'}</span>
                        </div>
                      ) : null}
                      {column.cards.map((card) => (
                        <article
                          className="project-card-modern"
                          key={card.id}
                          draggable
                          onDragStart={() => setDraggedCardId(card.id)}
                          onDragEnd={() => setDraggedCardId(null)}
                          data-testid={`project-card-${card.title}`}
                        >
                          <button
                            type="button"
                            className="project-card-edit-btn"
                            data-testid={`project-card-edit-${card.id}`}
                            aria-label={`Edit ${card.title}`}
                            onClick={(event) => openEditEditor(board.id, card, event.currentTarget)}
                          >
                            <div className="project-card-content-layout">
                              <div className="project-card-left">
                                <span className="project-card-title">{card.title}</span>
                              </div>
                              <div className="project-card-right">
                                <span className={`project-priority project-priority--${card.priority.toLowerCase()}`}>
                                  {card.priority}
                                </span>
                                {card.deadline ? (
                                  <div className="project-card-date">
                                    <CalendarDays aria-hidden="true" />
                                    <span>{deadlineState(card.deadline) === 'overdue' ? `Overdue ${card.deadline}` : card.deadline}</span>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </button>
                        </article>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : null}
          </div>
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


        {/* Delete Project AlertDialog */}
        <AlertDialog open={!!deletingBoard} onOpenChange={(open) => { if (!open && !deleteBoard.isPending) setDeletingBoard(null) }}>
          <AlertDialogContent>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>"{deletingBoard?.name}"</strong>? This project will be moved to Trash.
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


        {/* Card Editor Dialog */}
        <Dialog open={!!cardEditor} onOpenChange={(open) => { if (!open) closeEditor() }}>
          <DialogContent className="max-w-xl border-0 bg-transparent p-0 shadow-none">
            <ProjectCardDetailPanel
              mode={cardEditor?.mode ?? 'create'}
              editorKey={cardEditor ? (cardEditor.mode === 'create' ? `create-${cardEditor.columnId}` : `edit-${cardEditor.card.id}`) : 'none'}
              form={cardForm}
              pending={cardMutationPending}
              onChange={setCardForm}
              onSubmit={submitCard}
              onClose={closeEditor}
              onDelete={cardEditor?.mode === 'edit'
                ? () => {
                    const card = (cardEditor as { mode: 'edit'; boardId: string; card: projectApi.ProjectCard }).card
                    setDeletingCard({ boardId: (cardEditor as { mode: 'edit'; boardId: string; card: projectApi.ProjectCard }).boardId, cardId: card.id, title: card.title })
                  }
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

      {message ? <p className="flashcard-status flashcard-status--error project-status-notice" role="alert">{message}</p> : null}
      {(boardQuery.isError || boardsQuery.isError) ? <p className="flashcard-status flashcard-status--error project-status-notice" role="alert">Could not load Project data.</p> : null}
    </main>
  )
}
