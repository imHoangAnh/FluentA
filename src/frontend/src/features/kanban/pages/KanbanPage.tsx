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
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { type DragEvent, type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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

function deadlineState(deadline?: string | null) {
  if (!deadline) return 'none'
  if (deadline < todayInput) return 'overdue'
  const deadlineDate = new Date(`${deadline}T00:00:00`)
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
    deadline: '',
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
  const editorTriggerRef = useRef<HTMLElement | null>(null)
  const boardDeletePendingRef = useRef(false)
  const boardTabRefs = useRef(new Map<string, HTMLButtonElement>())
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
    },
  })

  const deleteBoard = useMutation({
    mutationFn: (boardId: string) => kanbanApi.deleteBoard(boardId),
    onSuccess: async (entry, boardId) => {
      const nextBoardId = selectedBoardId === boardId
        ? boards.find((item) => item.id !== boardId)?.id ?? null
        : selectedBoardId

      setMessage(null)
      if (selectedBoardId === boardId) setActiveBoardId(nextBoardId)
      await refresh(nextBoardId)
      window.requestAnimationFrame(() => {
        if (nextBoardId) boardTabRefs.current.get(nextBoardId)?.focus()
        else newBoardInputRef.current?.focus()
      })
      toast.success('Kanban board moved to Trash.', { action: { label: 'Undo', onClick: () => undo(entry.id, nextBoardId) } })
    },
    onError: () => setMessage('Could not delete this project.'),
    onSettled: () => { boardDeletePendingRef.current = false },
  })

  const createColumn = useMutation({
    mutationFn: (input: { boardId: string; name: string }) => kanbanApi.createColumn(input.boardId, input.name),
    onSuccess: async () => {
      setColumnName('')
      setColumnComposerOpen(false)
      await refresh()
    },
  })

  const updateColumn = useMutation({
    mutationFn: (input: { boardId: string; columnId: string; patch: { name?: string; sortOrder?: number } }) =>
      kanbanApi.updateColumn(input.boardId, input.columnId, input.patch),
    onSuccess: async () => refresh(),
  })

  const deleteColumn = useMutation({
    mutationFn: (input: { boardId: string; columnId: string }) => kanbanApi.deleteColumn(input.boardId, input.columnId),
    onSuccess: async (entry) => {
      setMessage(null)
      await refresh()
      toast.success('Kanban column moved to Trash.', { action: { label: 'Undo', onClick: () => undo(entry.id) } })
    },
    onError: () => setMessage('Only empty columns can be deleted.'),
  })

  const createCard = useMutation({
    mutationFn: (input: { boardId: string; card: kanbanApi.CreateKanbanCardInput }) => kanbanApi.createCard(input.boardId, input.card),
    onSuccess: async (_, input) => {
      closeEditor()
      await refresh(input.boardId)
    },
  })

  const updateCard = useMutation({
    mutationFn: (input: { boardId: string; id: string; patch: kanbanApi.UpdateKanbanCardInput }) => kanbanApi.updateCard(input.id, input.patch),
    onSuccess: async (_, input) => {
      closeEditor()
      await refresh(input.boardId)
    },
  })

  const moveCard = useMutation({
    mutationFn: (input: { id: string; columnId: string; sortOrder: number }) => kanbanApi.moveCard(input.id, input.columnId, input.sortOrder),
    onSuccess: async () => refresh(),
  })

  const deleteCard = useMutation({
    mutationFn: (input: { boardId: string; cardId: string }) => kanbanApi.deleteCard(input.cardId),
    onSuccess: async (entry, input) => {
      closeEditor()
      await refresh(input.boardId)
      toast.success('Kanban card moved to Trash.', { action: { label: 'Undo', onClick: () => undo(entry.id, input.boardId) } })
    },
  })

  function submitBoard(event: FormEvent) {
    event.preventDefault()
    if (!boardName.trim()) return
    createBoard.mutate(boardName.trim())
  }

  function submitColumn(event: FormEvent) {
    event.preventDefault()
    if (!selectedBoardId || !columnName.trim()) return
    createColumn.mutate({ boardId: selectedBoardId, name: columnName.trim() })
  }

  function undo(entryId: string, boardId: string | null = selectedBoardId) {
    void restoreTrashEntry(entryId)
      .then(() => refresh(boardId))
      .then(() => toast.success('Kanban item restored.'))
      .catch(() => toast.error('Could not restore the Kanban item.'))
  }

  function selectBoard(boardId: string) {
    setActiveBoardId(boardId)
    setColumnComposerOpen(false)
    setColumnName('')
    setCardEditor(null)
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
      deadline: card.deadline ?? '',
    })
    setCardEditor({ mode: 'edit', boardId, card })
  }

  function submitCard() {
    if (!cardEditor || !cardForm.title.trim()) return

    if (cardEditor.mode === 'create') {
      createCard.mutate({
        boardId: cardEditor.boardId,
        card: {
          columnId: cardEditor.columnId,
          title: cardForm.title.trim(),
          description: cardForm.description || null,
          priority: cardForm.priority,
          deadline: cardForm.deadline || null,
        },
      })
      return
    }

    updateCard.mutate({
      boardId: cardEditor.boardId,
      id: cardEditor.card.id,
      patch: {
        title: cardForm.title.trim(),
        description: cardForm.description,
        priority: cardForm.priority,
        deadline: cardForm.deadline,
      },
    })
  }

  function handleDrop(event: DragEvent, columnId: string) {
    event.preventDefault()
    if (!draggedCardId) return
    const targetColumn = columns.find((column) => column.id === columnId)
    moveCard.mutate({ id: draggedCardId, columnId, sortOrder: targetColumn?.cards.length ?? 0 })
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
              <span>Project boards</span>
              <ChevronRight aria-hidden="true" />
            </span>
            {boardsQuery.isLoading ? <span className="kanban-loading-label">Loading projects...</span> : null}
            {boards.map((item) => (
              <button
                ref={(element) => {
                  if (element) boardTabRefs.current.set(item.id, element)
                  else boardTabRefs.current.delete(item.id)
                }}
                type="button"
                key={item.id}
                className={`kanban-tab ${item.id === selectedBoardId ? 'kanban-tab--active' : ''}`}
                aria-current={item.id === selectedBoardId ? 'page' : undefined}
                title="Right-click to move this project to Trash"
                onClick={() => selectBoard(item.id)}
                onContextMenu={(event) => {
                  event.preventDefault()
                  if (!boardDeletePendingRef.current) {
                    boardDeletePendingRef.current = true
                    deleteBoard.mutate(item.id)
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
                    event.preventDefault()
                    if (!boardDeletePendingRef.current) {
                      boardDeletePendingRef.current = true
                      deleteBoard.mutate(item.id)
                    }
                  }
                }}
              >
                {item.name}
              </button>
            ))}

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
                <span className="kanban-project-kicker">Current project</span>
                <h2>{board?.name ?? (boardsQuery.isLoading || boardQuery.isLoading ? 'Loading project...' : 'Kanban projects')}</h2>
              </div>
            </div>

            <div className="kanban-column-tools">
              {columnComposerOpen ? (
                <form className="kanban-column-toolbar-form" onSubmit={submitColumn}>
                  <label className="sr-only" htmlFor="kanban-new-column">Column name</label>
                  <input
                    ref={columnInputRef}
                    id="kanban-new-column"
                    value={columnName}
                    onChange={(event) => setColumnName(event.target.value)}
                    placeholder="Column name"
                    data-testid="kanban-column-name-input"
                    maxLength={180}
                  />
                  <button
                    type="button"
                    className="kanban-column-toolbar-cancel"
                    aria-label="Cancel adding column"
                    onClick={() => {
                      setColumnName('')
                      setColumnComposerOpen(false)
                    }}
                  >
                    <X aria-hidden="true" />
                  </button>
                  <button type="submit" className="kanban-column-toolbar-submit" disabled={!columnName.trim() || createColumn.isPending}>
                    <Plus aria-hidden="true" />
                    <span>{createColumn.isPending ? 'Adding...' : 'Create column'}</span>
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  className="kanban-add-column-control"
                  disabled={!selectedBoardId}
                  onClick={() => setColumnComposerOpen(true)}
                >
                  <Plus aria-hidden="true" />
                  Add column
                </button>
              )}
            </div>
          </section>

          <header className="kanban-header" aria-label="Kanban card filters">
            <div className="kanban-filter-bar">
              <label className="kanban-filter-control">
                <Flag aria-hidden="true" />
                <span className="sr-only">Priority</span>
                <select
                  aria-label="Filter by priority"
                  value={filters.priority}
                  onChange={(event) => setFilters((current) => ({ ...current, priority: event.target.value }))}
                >
                  <option value="">All priorities</option>
                  {kanbanPriorities.map((priority) => <option value={priority} key={priority}>{priority}</option>)}
                </select>
              </label>
              <label className="kanban-filter-control">
                <CalendarDays aria-hidden="true" />
                <span className="sr-only">Deadline</span>
                <select
                  aria-label="Filter by deadline"
                  value={filters.deadline}
                  onChange={(event) => setFilters((current) => ({ ...current, deadline: event.target.value }))}
                >
                  <option value="">All deadlines</option>
                  <option value="has">Has deadline</option>
                  <option value="overdue">Overdue</option>
                  <option value="week">Due this week</option>
                </select>
              </label>
            </div>
          </header>

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
                          onClick={() => deleteColumn.mutate({ boardId: board.id, columnId: column.id })}
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
                          <div className="kanban-card-meta-row">
                            <span className={`kanban-priority kanban-priority--${card.priority.toLowerCase()}`}>
                              {card.priority === 'High' || card.priority === 'Critical'
                                ? <AlertCircle aria-hidden="true" />
                                : <ArrowDown aria-hidden="true" />}
                              {card.priority}
                            </span>
                          </div>
                          <button
                            type="button"
                            className="kanban-card-edit-btn"
                            aria-label={`Edit ${card.title}`}
                            onClick={(event) => openEditEditor(board.id, card, event.currentTarget)}
                          >
                            <span className="kanban-card-title">{card.title}</span>
                          </button>
                          <footer className="kanban-card-footer">
                            {card.deadline ? (
                              <div className="kanban-card-date">
                                <CalendarDays aria-hidden="true" />
                                <span>{deadlineState(card.deadline) === 'overdue' ? `Overdue ${card.deadline}` : card.deadline}</span>
                              </div>
                            ) : <span />}
                            <select
                              className="kanban-card-move"
                              aria-label={`Move ${card.title} to column`}
                              value={card.columnId}
                              disabled={moveCard.isPending}
                              draggable={false}
                              onClick={(event) => event.stopPropagation()}
                              onChange={(event) => moveCardToColumn(card, event.target.value)}
                            >
                              {columns.map((targetColumn) => (
                                <option value={targetColumn.id} key={targetColumn.id}>{targetColumn.name}</option>
                              ))}
                            </select>
                          </footer>
                        </article>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {cardEditor ? (
          <KanbanCardDetailPanel
            mode={cardEditor.mode}
            editorKey={cardEditor.mode === 'create' ? `create-${cardEditor.columnId}` : `edit-${cardEditor.card.id}`}
            form={cardForm}
            pending={cardMutationPending}
            onChange={setCardForm}
            onSubmit={submitCard}
            onClose={closeEditor}
            onDelete={cardEditor.mode === 'edit'
              ? () => deleteCard.mutate({ boardId: cardEditor.boardId, cardId: cardEditor.card.id })
              : undefined}
          />
        ) : null}
      </div>

      {message ? <p className="flashcard-status flashcard-status--error kanban-status-notice" role="alert">{message}</p> : null}
      {(boardQuery.isError || boardsQuery.isError) ? <p className="flashcard-status flashcard-status--error kanban-status-notice" role="alert">Could not load Kanban data.</p> : null}
    </main>
  )
}
