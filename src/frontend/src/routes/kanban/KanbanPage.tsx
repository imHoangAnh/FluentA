import { ArrowRight, BarChart3, BookOpen, CalendarDays, CheckSquare, Columns3, Edit3, Filter, Loader2, Plus, Search, Trash2 } from 'lucide-react'
import { type DragEvent, type FormEvent, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import * as kanbanApi from '../../lib/api/kanban.api'

const priorities = ['Low', 'Medium', 'High', 'Critical'] as const
const today = new Date()
const todayInput = `${today.getFullYear()}-${`${today.getMonth() + 1}`.padStart(2, '0')}-${`${today.getDate()}`.padStart(2, '0')}`

function splitTags(value: string) {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

function deadlineState(deadline?: string | null) {
  if (!deadline) return 'none'
  if (deadline < todayInput) return 'overdue'
  const deadlineDate = new Date(`${deadline}T00:00:00`)
  const weekEnd = new Date()
  weekEnd.setDate(weekEnd.getDate() + 7)
  return deadlineDate <= weekEnd ? 'this-week' : 'later'
}

function cardMatches(card: kanbanApi.KanbanCard, filters: { search: string; tag: string; priority: string; deadline: string }) {
  const query = filters.search.trim().toLowerCase()
  if (query && !card.title.toLowerCase().includes(query)) return false
  if (filters.tag && !card.tags.some((tag) => tag.toLowerCase() === filters.tag.toLowerCase())) return false
  if (filters.priority && card.priority !== filters.priority) return false
  if (filters.deadline === 'has' && !card.deadline) return false
  if (filters.deadline === 'overdue' && deadlineState(card.deadline) !== 'overdue') return false
  if (filters.deadline === 'week' && deadlineState(card.deadline) !== 'this-week') return false
  return true
}

function emptyCardForm(columnId = '') {
  return {
    columnId,
    title: '',
    description: '',
    priority: 'Medium',
    deadline: '',
    tags: '',
  }
}

export function KanbanPage() {
  const queryClient = useQueryClient()
  const [boardName, setBoardName] = useState('')
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null)
  const [columnName, setColumnName] = useState('')
  const [cardForm, setCardForm] = useState(() => emptyCardForm())
  const [editingCard, setEditingCard] = useState<kanbanApi.KanbanCard | null>(null)
  const [editForm, setEditForm] = useState(() => emptyCardForm())
  const [filters, setFilters] = useState({ search: '', tag: '', priority: '', deadline: '' })
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

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
  const allCards = useMemo(() => columns.flatMap((column) => column.cards), [columns])
  const tagOptions = useMemo(() => Array.from(new Set(allCards.flatMap((card) => card.tags))).toSorted(), [allCards])
  const selectedCardColumnId = cardForm.columnId || columns[0]?.id || ''
  const visibleColumns = useMemo(
    () => columns.map((column) => ({
      ...column,
      cards: column.cards
        .filter((card) => cardMatches(card, filters))
        .toSorted((left, right) => left.sortOrder - right.sortOrder || left.createdAt.localeCompare(right.createdAt)),
    })),
    [columns, filters],
  )

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
    mutationFn: kanbanApi.deleteBoard,
    onSuccess: async () => {
      setActiveBoardId(null)
      await refresh(null)
    },
  })

  const createColumn = useMutation({
    mutationFn: (input: { boardId: string; name: string }) => kanbanApi.createColumn(input.boardId, input.name),
    onSuccess: async () => {
      setColumnName('')
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
    onSuccess: async () => {
      setMessage(null)
      await refresh()
    },
    onError: () => setMessage('Only empty columns can be deleted.'),
  })

  const createCard = useMutation({
    mutationFn: (input: kanbanApi.CreateKanbanCardInput) => kanbanApi.createCard(selectedBoardId!, input),
    onSuccess: async () => {
      setCardForm(emptyCardForm(columns[0]?.id ?? ''))
      await refresh()
    },
  })

  const updateCard = useMutation({
    mutationFn: (input: { id: string; patch: kanbanApi.UpdateKanbanCardInput }) => kanbanApi.updateCard(input.id, input.patch),
    onSuccess: async () => {
      setEditingCard(null)
      await refresh()
    },
  })

  const moveCard = useMutation({
    mutationFn: (input: { id: string; columnId: string; sortOrder: number }) => kanbanApi.moveCard(input.id, input.columnId, input.sortOrder),
    onSuccess: async () => refresh(),
  })

  const deleteCard = useMutation({
    mutationFn: kanbanApi.deleteCard,
    onSuccess: async () => refresh(),
  })

  function submitBoard(event: FormEvent) {
    event.preventDefault()
    if (!boardName.trim()) return
    createBoard.mutate(boardName)
  }

  function submitColumn(event: FormEvent) {
    event.preventDefault()
    if (!selectedBoardId || !columnName.trim()) return
    createColumn.mutate({ boardId: selectedBoardId, name: columnName })
  }

  function submitCard(event: FormEvent) {
    event.preventDefault()
    if (!cardForm.title.trim() || !selectedCardColumnId) return
    createCard.mutate({
      columnId: selectedCardColumnId,
      title: cardForm.title,
      description: cardForm.description || null,
      priority: cardForm.priority,
      deadline: cardForm.deadline || null,
      tags: splitTags(cardForm.tags),
    })
  }

  function openEditor(card: kanbanApi.KanbanCard) {
    setEditingCard(card)
    setEditForm({
      columnId: card.columnId,
      title: card.title,
      description: card.description ?? '',
      priority: card.priority,
      deadline: card.deadline ?? '',
      tags: card.tags.join(', '),
    })
  }

  function submitEdit(event: FormEvent) {
    event.preventDefault()
    if (!editingCard || !editForm.title.trim()) return
    updateCard.mutate({
      id: editingCard.id,
      patch: {
        title: editForm.title,
        description: editForm.description,
        priority: editForm.priority,
        deadline: editForm.deadline,
        tags: splitTags(editForm.tags),
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

  return (
    <main className="workspace kanban-workspace">
      <header className="workspace-header">
        <div className="brand-inline">
          <span className="brand-mark brand-mark--small">FA</span>
          <strong>FluentA</strong>
        </div>
        <nav className="workspace-nav" aria-label="Kanban navigation">
          <Link className="ghost-button ghost-button--inline" to="/">
            <BarChart3 size={17} /> Dashboard
          </Link>
          <Link className="ghost-button ghost-button--inline" to="/vocabulary">
            <BookOpen size={17} /> Vocabulary
          </Link>
          <Link className="ghost-button ghost-button--inline" to="/todo">
            <CheckSquare size={17} /> Todo
          </Link>
        </nav>
      </header>

      <section className="kanban-shell">
        <div className="kanban-hero">
          <div>
            <span className="preview-label">Project Management</span>
            <h1>Kanban Board</h1>
            <p>{boards.length} boards · {allCards.length} cards in the active board</p>
          </div>
          <Columns3 size={38} />
        </div>

        <section className="kanban-topbar">
          <form className="kanban-create-board" onSubmit={submitBoard}>
            <label>
              Board name
              <input data-testid="kanban-board-name-input" value={boardName} onChange={(event) => setBoardName(event.target.value)} placeholder="Q3 language sprint" />
            </label>
            <button className="primary-button" type="submit" disabled={!boardName.trim() || createBoard.isPending}>
              {createBoard.isPending ? <Loader2 size={18} /> : <Plus size={18} />} Create board
            </button>
          </form>

          <div className="kanban-board-list" aria-label="Kanban boards">
            {boardsQuery.isLoading ? <p>Loading boards...</p> : null}
            {boards.map((item) => (
              <button
                className={item.id === selectedBoardId ? 'kanban-board-tab kanban-board-tab--active' : 'kanban-board-tab'}
                key={item.id}
                type="button"
                onClick={() => setActiveBoardId(item.id)}
              >
                <strong>{item.name}</strong>
                <span>{item.cardCount} cards</span>
              </button>
            ))}
          </div>
        </section>

        {!board && !boardsQuery.isLoading ? (
          <div className="empty-panel kanban-empty">
            <Columns3 size={30} />
            <h2>No Kanban boards yet</h2>
            <p>Create a board and FluentA will set up To Do, In Progress, and Done for you.</p>
          </div>
        ) : null}

        {board ? (
          <>
            <section className="kanban-board-tools">
              <div>
                <span className="preview-label">Active board</span>
                <h2>{board.name}</h2>
              </div>
              <button className="icon-button icon-button--danger" type="button" aria-label={`Delete board ${board.name}`} onClick={() => deleteBoard.mutate(board.id)}>
                <Trash2 size={17} />
              </button>
            </section>

            <form className="kanban-column-form" onSubmit={submitColumn}>
              <label>
                New column
                <input data-testid="kanban-column-name-input" value={columnName} onChange={(event) => setColumnName(event.target.value)} placeholder="Blocked" />
              </label>
              <button className="ghost-button ghost-button--inline" type="submit" disabled={!columnName.trim() || createColumn.isPending}>
                <Plus size={17} /> Add column
              </button>
            </form>

            <form className="kanban-card-form" onSubmit={submitCard}>
              <label>
                Card title
                <input data-testid="kanban-card-title-input" value={cardForm.title} onChange={(event) => setCardForm({ ...cardForm, title: event.target.value })} placeholder="Draft lesson plan" />
              </label>
              <label>
                Column
                <select data-testid="kanban-card-column-select" value={selectedCardColumnId} onChange={(event) => setCardForm({ ...cardForm, columnId: event.target.value })}>
                  {columns.map((column) => <option value={column.id} key={column.id}>{column.name}</option>)}
                </select>
              </label>
              <label>
                Priority
                <select data-testid="kanban-card-priority-select" value={cardForm.priority} onChange={(event) => setCardForm({ ...cardForm, priority: event.target.value })}>
                  {priorities.map((priority) => <option value={priority} key={priority}>{priority}</option>)}
                </select>
              </label>
              <label>
                Deadline
                <input data-testid="kanban-card-deadline-input" type="date" value={cardForm.deadline} onChange={(event) => setCardForm({ ...cardForm, deadline: event.target.value })} />
              </label>
              <label className="kanban-field-wide">
                Description
                <textarea data-testid="kanban-card-description-input" value={cardForm.description} onChange={(event) => setCardForm({ ...cardForm, description: event.target.value })} placeholder="Optional details" />
              </label>
              <label>
                Tags
                <input data-testid="kanban-card-tags-input" value={cardForm.tags} onChange={(event) => setCardForm({ ...cardForm, tags: event.target.value })} placeholder="Study, Project" />
              </label>
              <button className="primary-button" type="submit" disabled={!cardForm.title.trim() || !selectedCardColumnId || createCard.isPending}>
                <Plus size={18} /> Add card
              </button>
            </form>

            <section className="kanban-filters" aria-label="Kanban filters">
              <Search size={18} />
              <input data-testid="kanban-search-input" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Search card title" />
              <select aria-label="Filter by tag" value={filters.tag} onChange={(event) => setFilters({ ...filters, tag: event.target.value })}>
                <option value="">All tags</option>
                {tagOptions.map((tag) => <option value={tag} key={tag}>{tag}</option>)}
              </select>
              <select aria-label="Filter by priority" value={filters.priority} onChange={(event) => setFilters({ ...filters, priority: event.target.value })}>
                <option value="">All priorities</option>
                {priorities.map((priority) => <option value={priority} key={priority}>{priority}</option>)}
              </select>
              <select aria-label="Filter by deadline" value={filters.deadline} onChange={(event) => setFilters({ ...filters, deadline: event.target.value })}>
                <option value="">All deadlines</option>
                <option value="has">Has deadline</option>
                <option value="overdue">Overdue</option>
                <option value="week">This week</option>
              </select>
              <Filter size={18} />
            </section>

            {message ? <p className="flashcard-status flashcard-status--error">{message}</p> : null}

            <section className="kanban-board" aria-label="Kanban board">
              {visibleColumns.map((column) => (
                <article
                  className="kanban-column"
                  key={column.id}
                  data-testid={`kanban-column-${column.name}`}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => handleDrop(event, column.id)}
                >
                  <header>
                    <input
                      aria-label={`Rename column ${column.name}`}
                      defaultValue={column.name}
                      onBlur={(event) => {
                        if (event.target.value.trim() && event.target.value.trim() !== column.name) {
                          updateColumn.mutate({ boardId: board.id, columnId: column.id, patch: { name: event.target.value } })
                        }
                      }}
                    />
                    <button className="icon-button icon-button--danger" type="button" aria-label={`Delete column ${column.name}`} onClick={() => deleteColumn.mutate({ boardId: board.id, columnId: column.id })}>
                      <Trash2 size={16} />
                    </button>
                  </header>
                  <div className="kanban-card-list">
                    {column.cards.length === 0 ? <p className="kanban-column-empty">No visible cards</p> : null}
                    {column.cards.map((card) => (
                      <article className="kanban-card" key={card.id} draggable onDragStart={() => setDraggedCardId(card.id)} data-testid={`kanban-card-${card.title}`}>
                        <header>
                          <strong>{card.title}</strong>
                          <span className={`kanban-priority kanban-priority--${card.priority.toLowerCase()}`}>{card.priority}</span>
                        </header>
                        {card.description ? <p>{card.description}</p> : null}
                        <footer>
                          {card.deadline ? <span className={deadlineState(card.deadline) === 'overdue' ? 'kanban-deadline kanban-deadline--overdue' : 'kanban-deadline'}><CalendarDays size={13} /> {deadlineState(card.deadline) === 'overdue' ? `Overdue ${card.deadline}` : card.deadline}</span> : <span>No deadline</span>}
                          <div className="kanban-card-tags">{card.tags.map((tag) => <small key={tag}>{tag}</small>)}</div>
                        </footer>
                        <div className="kanban-card-actions">
                          <button type="button" className="ghost-button ghost-button--inline" onClick={() => openEditor(card)}>
                            <Edit3 size={15} /> Edit
                          </button>
                          <button type="button" className="ghost-button ghost-button--inline" onClick={() => {
                            const currentIndex = columns.findIndex((candidate) => candidate.id === card.columnId)
                            const target = columns[Math.min(columns.length - 1, currentIndex + 1)]
                            if (target) moveCard.mutate({ id: card.id, columnId: target.id, sortOrder: target.cards.length })
                          }}>
                            Move <ArrowRight size={15} />
                          </button>
                          <button type="button" className="icon-button icon-button--danger" aria-label={`Delete card ${card.title}`} onClick={() => deleteCard.mutate(card.id)}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </article>
              ))}
            </section>

            {editingCard ? (
              <form className="kanban-edit-panel" onSubmit={submitEdit} aria-label="Edit Kanban card">
                <header>
                  <div>
                    <span className="preview-label">Card detail</span>
                    <h2>Edit card</h2>
                  </div>
                  <button type="button" className="ghost-button ghost-button--inline" onClick={() => setEditingCard(null)}>Close</button>
                </header>
                <label>
                  Title
                  <input data-testid="kanban-edit-title-input" value={editForm.title} onChange={(event) => setEditForm({ ...editForm, title: event.target.value })} />
                </label>
                <label>
                  Description
                  <textarea value={editForm.description} onChange={(event) => setEditForm({ ...editForm, description: event.target.value })} />
                </label>
                <label>
                  Priority
                  <select value={editForm.priority} onChange={(event) => setEditForm({ ...editForm, priority: event.target.value })}>
                    {priorities.map((priority) => <option value={priority} key={priority}>{priority}</option>)}
                  </select>
                </label>
                <label>
                  Deadline
                  <input type="date" value={editForm.deadline} onChange={(event) => setEditForm({ ...editForm, deadline: event.target.value })} />
                </label>
                <label>
                  Tags
                  <input value={editForm.tags} onChange={(event) => setEditForm({ ...editForm, tags: event.target.value })} />
                </label>
                <button className="primary-button" type="submit" disabled={!editForm.title.trim() || updateCard.isPending}>Save card</button>
              </form>
            ) : null}
          </>
        ) : null}

        {boardQuery.isError || boardsQuery.isError ? <p className="flashcard-status flashcard-status--error">Could not load Kanban data.</p> : null}
      </section>
    </main>
  )
}
