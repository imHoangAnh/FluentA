import {
  AlertCircle,
  ArrowDown,
  CalendarDays,
  ChevronRight,
  CircleCheckBig,
  CircleDashed,
  Clock3,
  Columns3,
  Flag,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { type DragEvent, type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as ContextMenu from '@radix-ui/react-context-menu'
import { menuContentClassName, menuItemClassName } from '@/shared/components/ui/menu-styles'
import { AlertDialog, AlertDialogActionButton, AlertDialogCancelButton, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from '@/shared/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog'
import { KanbanCardDetailPanel } from '../components/KanbanCardDetailPanel'
import { type KanbanCardForm, kanbanPriorities } from '../components/kanban-card-editor'
import * as kanbanApi from '../api/kanban.api'
import { restoreTrashEntry } from '@/features/trash'
import { toast } from '@/lib/toast'

const today = new Date()
const todayInput = `${today.getFullYear()}-${`${today.getMonth() + 1}`.padStart(2, '0')}-${`${today.getDate()}`.padStart(2, '0')}`

type CardEditor =
  | { mode: 'create'; boardId: string; columnId: string }
  | { mode: 'edit'; boardId: string; card: kanbanApi.KanbanCard }

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

function cardMatches(card: kanbanApi.KanbanCard, filters: { priority: string; deadline: string }) {
  if (filters.priority && card.priority !== filters.priority) return false
  if (filters.deadline === 'has' && !card.deadline) return false
  if (filters.deadline === 'overdue' && deadlineState(card.deadline) !== 'overdue') return false
  if (filters.deadline === 'week' && deadlineState(card.deadline) !== 'this-week') return false
  return true
}

function emptyCardForm(columnId = ''): KanbanCardForm {
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

export function KanbanPage() {
  const queryClient = useQueryClient()
  const [boardName, setBoardName] = useState('')
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null)
  const [columnName, setColumnName] = useState('')
  const [columnComposerOpen, setColumnComposerOpen] = useState(false)
  const [cardEditor, setCardEditor] = useState<CardEditor | null>(null)
  const [cardForm, setCardForm] = useState<KanbanCardForm>(() => emptyCardForm())
  const [filters, setFilters] = useState({ priority: '', deadline: '' })
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [editingBoardId, setEditingBoardId] = useState<string | null>(null)
  const [editingBoardName, setEditingBoardName] = useState('')
  const [deletingBoard, setDeletingBoard] = useState<kanbanApi.KanbanBoardSummary | null>(null)
  const [deletingColumn, setDeletingColumn] = useState<{ boardId: string; columnId: string; name: string } | null>(null)
  const [deletingCard, setDeletingCard] = useState<{ boardId: string; cardId: string; title: string } | null>(null)
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
    queryKey: ['kanban', 'boards'],
    queryFn: kanbanApi.listBoards,
  })

  const boards = boardsQuery.data ?? []
  const selectedBoardId = activeBoardId ?? boards[0]?.id ?? null

  const boardQuery = useQuery({
    queryKey: ['kanban', 'board', selectedBoardId],
    queryFn: () => kanbanApi.getBoard(selectedBoardId!),
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
    await queryClient.invalidateQueries({ queryKey: ['kanban', 'boards'] })
    if (boardId) {
      await queryClient.invalidateQueries({ queryKey: ['kanban', 'board', boardId] })
    }
  }

  const createBoard = useMutation({
    mutationFn: kanbanApi.createBoard,
    onSuccess: async (created) => {
      setBoardName('')
      setActiveBoardId(created.id)
      await refresh(created.id)
      toast.success('Project created.')
    },
    onError: () => toast.error('Could not create project.'),
  })

  const updateBoard = useMutation({
    mutationFn: ({ boardId, name }: { boardId: string; name: string }) => kanbanApi.updateBoard(boardId, name),
    onSuccess: async (updated) => {
      setEditingBoardId(null)
      await refresh(updated.id)
      toast.success('Project renamed.')
    },
    onError: () => toast.error('Could not rename project.'),
  })

  const deleteBoard = useMutation({
    mutationFn: (boardId: string) => kanbanApi.deleteBoard(boardId),
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
      const restored = await restoreTrashEntry(entryId)
      await refresh(restored.entityId ?? activeId)
      if (restored.entityId) setActiveBoardId(restored.entityId)
      toast.success('Item restored.')
    } catch {
      toast.error('Could not restore the item.')
    }
  }

  const createColumn = useMutation({
    mutationFn: ({ boardId, name }: { boardId: string; name: string }) => kanbanApi.createColumn(boardId, name),
    onSuccess: async (column, { boardId }) => {
      setColumnName('')
      setColumnComposerOpen(false)
      await refresh(boardId)
      toast.success('Column created.')
    },
    onError: () => toast.error('Could not create column.'),
  })

  const updateColumn = useMutation({
    mutationFn: ({ boardId, columnId, patch }: { boardId: string; columnId: string; patch: { name?: string; sortOrder?: number } }) =>
      kanbanApi.updateColumn(boardId, columnId, patch),
    onSuccess: async (_, { boardId }) => {
      await refresh(boardId)
    },
    onError: () => toast.error('Could not update column.'),
  })

  const deleteColumn = useMutation({
    mutationFn: ({ boardId, columnId }: { boardId: string; columnId: string }) => kanbanApi.deleteColumn(boardId, columnId),
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
    mutationFn: ({ boardId, input }: { boardId: string; input: kanbanApi.CreateKanbanCardInput }) => kanbanApi.createCard(boardId, input),
    onSuccess: async (_, { boardId }) => {
      setCardEditor(null)
      await refresh(boardId)
      toast.success('Card created.')
    },
    onError: () => toast.error('Could not create card.'),
  })

  const updateCard = useMutation({
    mutationFn: ({ boardId, cardId, patch }: { boardId: string; cardId: string; patch: kanbanApi.UpdateKanbanCardInput }) =>
      kanbanApi.updateCard(cardId, patch),
    onSuccess: async (_, { boardId }) => {
      setCardEditor(null)
      await refresh(boardId)
      toast.success('Card updated.')
    },
    onError: () => toast.error('Could not update card.'),
  })

  const deleteCard = useMutation({
    mutationFn: ({ boardId, cardId }: { boardId: string; cardId: string }) => kanbanApi.deleteCard(cardId),
    onSuccess: async (entry, { boardId }) => {
      setCardEditor(null)
      await refresh(boardId)
      toast.success('Card moved to Trash.', { action: { label: 'Undo', onClick: () => undo(entry.id, boardId) } })
    },
    onError: () => toast.error('Could not delete card.'),
  })

  const moveCard = useMutation({
    mutationFn: ({ id, columnId, sortOrder }: { id: string; columnId: string; sortOrder: number }) => kanbanApi.moveCard(id, columnId, sortOrder),
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

  function openEditEditor(boardId: string, card: kanbanApi.KanbanCard, trigger: HTMLElement) {
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

  function moveCardToColumn(card: kanbanApi.KanbanCard, columnId: string) {
    if (columnId === card.columnId) return
    const targetColumn = columns.find((column) => column.id === columnId)
    moveCard.mutate({ id: card.id, columnId, sortOrder: targetColumn?.cards.length ?? 0 })
  }

  const cardMutationPending = createCard.isPending || updateCard.isPending || deleteCard.isPending
  const hasActiveFilters = Boolean(filters.priority || filters.deadline)

  return (
    <main className="kanban-main-wrapper" data-testid="kanban-page">
      <div className="kanban-workspace">
        <div className="kanban-content" data-testid="kanban-route-workspace">
          <nav className="kanban-board-tabs" aria-label="Kanban projects" data-testid="kanban-project-navigation">
            <span className="kanban-board-tabs__label">
              <Columns3 aria-hidden="true" />
              <span>Project</span>
              <ChevronRight aria-hidden="true" />
            </span>
            {boardsQuery.isLoading ? <span className="kanban-loading-label">Loading projects...</span> : null}
            {boards.map((item) =>
              editingBoardId === item.id ? (
                <div
                  key={item.id}
                  className={`kanban-tab kanban-tab--active ${item.id === selectedBoardId ? 'kanban-tab--active' : ''}`}
                >
                  <input
                    ref={editingBoardInputRef}
                    className="kanban-tab-rename-input"
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
                      className={`kanban-tab ${item.id === selectedBoardId ? 'kanban-tab--active' : ''}`}
                      aria-current={item.id === selectedBoardId ? 'page' : undefined}
                      title="Right-click for options"
                      onClick={() => selectBoard(item.id)}
                    >
                      {item.name}
                    </button>
                  </ContextMenu.Trigger>
                  <ContextMenu.Portal>
                    <ContextMenu.Content className={menuContentClassName} data-testid="kanban-board-context-menu">
                      <ContextMenu.Item
                        className={menuItemClassName}
                        onSelect={() => {
                          setEditingBoardId(item.id)
                          setEditingBoardName(item.name)
                        }}
                      >
                        <Pencil className="size-4 mr-2" aria-hidden="true" />
                        <span>Rename</span>
                      </ContextMenu.Item>
                      <ContextMenu.Item
                        className={`${menuItemClassName} text-red-600 dark:text-red-400`}
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

            <form className="kanban-new-board-form" onSubmit={submitBoard}>
              <Plus aria-hidden="true" />
              <label className="sr-only" htmlFor="kanban-new-project">New project name</label>
              <input
                ref={newBoardInputRef}
                id="kanban-new-project"
                value={boardName}
                onChange={(event) => setBoardName(event.target.value)}
                placeholder="New project"
                data-testid="kanban-board-name-input"
                className="kanban-new-board-input"
                maxLength={180}
              />
            </form>
          </nav>

          <section className="kanban-project-header">
            <div className="kanban-project-title-area">
              <span className="kanban-project-icon" aria-hidden="true"><Columns3 /></span>
              <div>
                <h2>{board?.name ?? (boardsQuery.isLoading || boardQuery.isLoading ? 'Loading project...' : 'Kanban projects')}</h2>
              </div>
            </div>

            <div className="kanban-column-tools">
              <div className="kanban-filter-bar" aria-label="Kanban card filters">
                <select
                  className="kanban-filter-control"
                  aria-label="Filter by priority"
                  value={filters.priority}
                  onChange={(event) => setFilters((current) => ({ ...current, priority: event.target.value }))}
                >
                  <option value="">All priorities</option>
                  {kanbanPriorities.map((priority) => <option value={priority} key={priority}>{priority}</option>)}
                </select>
                <select
                  className="kanban-filter-control"
                  aria-label="Filter by deadline"
                  value={filters.deadline}
                  onChange={(event) => setFilters((current) => ({ ...current, deadline: event.target.value }))}
                >
                  <option value="">All deadlines</option>
                  <option value="has">Has deadline</option>
                  <option value="overdue">Overdue</option>
                  <option value="week">Due this week</option>
                </select>
              </div>

              <button
                type="button"
                className="kanban-add-column-control"
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

          <div className="kanban-board-container" aria-label="Kanban board" data-testid="kanban-board-surface">
            {selectedBoardId && boardQuery.isLoading ? <p className="kanban-board-loading" role="status">Loading project board...</p> : null}
            {!selectedBoardId && !boardsQuery.isLoading ? (
              <div className="empty-panel kanban-empty">
                <Columns3 aria-hidden="true" />
                <h2>No Kanban projects yet</h2>
                <p>Create a project and FluentA will set up To Do, In Progress, and Done for you.</p>
              </div>
            ) : null}

            {board ? (
              <div className="kanban-columns-scroll" data-testid="kanban-columns">
                {visibleColumns.map((column) => (
                  <section
                    className="kanban-column-modern"
                    key={column.id}
                    data-testid={`kanban-column-${column.name}`}
                    aria-label={`${column.name} column`}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => handleDrop(event, column.id)}
                  >
                    <header className="kanban-column-header">
                      <div className="kanban-column-title">
                        <span className="kanban-column-icon"><ColumnStatusIcon name={column.name} /></span>
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
                      <div className="kanban-column-actions">
                        <span className="kanban-column-count" aria-label={`${column.cards.length} cards`}>{column.cards.length}</span>
                        <button
                          className="kanban-column-menu"
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
                      className="kanban-add-card-btn"
                      onClick={(event) => openCreateEditor(board.id, column.id, event.currentTarget)}
                    >
                      <Plus aria-hidden="true" />
                      Add Card
                    </button>

                    <div className="kanban-cards-list">
                      {column.cards.length === 0 ? (
                        <div className="kanban-column-empty" role="status">
                          <span className="kanban-column-empty__icon"><ColumnStatusIcon name={column.name} /></span>
                          <strong>{hasActiveFilters ? 'No matching cards' : 'No cards yet'}</strong>
                          <span>{hasActiveFilters ? 'Try another priority or deadline.' : 'Add a card to get started.'}</span>
                        </div>
                      ) : null}
                      {column.cards.map((card) => (
                        <article
                          className="kanban-card-modern"
                          key={card.id}
                          draggable
                          onDragStart={() => setDraggedCardId(card.id)}
                          onDragEnd={() => setDraggedCardId(null)}
                          data-testid={`kanban-card-${card.title}`}
                        >
                          <button
                            type="button"
                            className="kanban-card-edit-btn"
                            data-testid={`kanban-card-edit-${card.id}`}
                            aria-label={`Edit ${card.title}`}
                            onClick={(event) => openEditEditor(board.id, card, event.currentTarget)}
                          >
                            <div className="kanban-card-content-layout">
                              <div className="kanban-card-left">
                                <span className="kanban-card-title">{card.title}</span>
                              </div>
                              <div className="kanban-card-right">
                                <span className={`kanban-priority kanban-priority--${card.priority.toLowerCase()}`}>
                                  {card.priority}
                                </span>
                                {card.deadline ? (
                                  <div className="kanban-card-date">
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
                <label htmlFor="kanban-new-column" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ds-foreground)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  Column Name
                  <input
                    ref={columnInputRef}
                    id="kanban-new-column"
                    value={columnName}
                    onChange={(event) => setColumnName(event.target.value)}
                    placeholder="Enter column name"
                    data-testid="kanban-column-name-input"
                    maxLength={180}
                    autoFocus
                    required
                    style={{ minHeight: 40, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--ds-border)', background: 'var(--ds-background)', color: 'var(--ds-foreground)', fontSize: 14, outline: 'none', width: '100%' }}
                  />
                </label>
              </div>
              <DialogFooter style={{ marginTop: 20 }}>
                <button type="button" className="kanban-secondary-btn" onClick={() => { setColumnName(''); setColumnComposerOpen(false) }}>Cancel</button>
                <button type="submit" className="kanban-primary-btn" disabled={!columnName.trim() || createColumn.isPending}>
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
          <DialogContent className="max-w-xl">
            <KanbanCardDetailPanel
              mode={cardEditor?.mode ?? 'create'}
              editorKey={cardEditor ? (cardEditor.mode === 'create' ? `create-${cardEditor.columnId}` : `edit-${cardEditor.card.id}`) : 'none'}
              form={cardForm}
              pending={cardMutationPending}
              onChange={setCardForm}
              onSubmit={submitCard}
              onClose={closeEditor}
              onDelete={cardEditor?.mode === 'edit'
                ? () => {
                    const card = (cardEditor as { mode: 'edit'; boardId: string; card: kanbanApi.KanbanCard }).card
                    setDeletingCard({ boardId: (cardEditor as { mode: 'edit'; boardId: string; card: kanbanApi.KanbanCard }).boardId, cardId: card.id, title: card.title })
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

      {message ? <p className="flashcard-status flashcard-status--error kanban-status-notice" role="alert">{message}</p> : null}
      {(boardQuery.isError || boardsQuery.isError) ? <p className="flashcard-status flashcard-status--error kanban-status-notice" role="alert">Could not load Kanban data.</p> : null}
    </main>
  )
}
