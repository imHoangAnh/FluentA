import {
  Bell, BookOpen, CalendarClock, CheckSquare, Columns3, Globe, HelpCircle,
  LogOut, NotebookPen, Repeat2, Settings, CalendarDays, ChevronRight,
  Search, Trash2, X, Kanban, Filter, Plus, ArrowDown, AlertCircle, Timer
} from 'lucide-react'
import { type DragEvent, type FormEvent, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation } from 'react-router-dom'
import { getUserAvatarUrl } from '../../lib/avatar'
import { LearningNavLinks } from '../../components/LearningNavLinks'
import { useAuthStore } from '../../stores/authStore'
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
  const logout = useAuthStore((state) => state.logout)
  const user = useAuthStore((state) => state.user)
  const location = useLocation()
  const displayName = user?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'Learner'
  const avatarUrl = getUserAvatarUrl(user, displayName)

  const [boardName, setBoardName] = useState('')
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null)
  const [columnName, setColumnName] = useState('')
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

    if (editingCard.id === 'new') {
      createCard.mutate({
        columnId: editForm.columnId,
        title: editForm.title,
        description: editForm.description || null,
        priority: editForm.priority,
        deadline: editForm.deadline || null,
        tags: splitTags(editForm.tags),
      }, {
        onSuccess: () => setEditingCard(null)
      })
      return
    }

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
    <div className="dashboard-layout">
      {/* SideNavBar */}
      <aside className="dashboard-sidebar">
        <div className="dashboard-brand">
          <div className="dashboard-brand-icon">
            <Globe size={24} />
          </div>
          <div className="dashboard-brand-text">
            <h1>FluentA</h1>
            <p>Language Learning</p>
          </div>
        </div>

        <nav className="dashboard-nav">
          <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
            <Columns3 size={20} /> Today
          </Link>
          <Link to="/vocabulary" className={location.pathname === '/vocabulary' ? 'active' : ''}>
            <BookOpen size={20} /> Vocabulary
          </Link>
          <LearningNavLinks />
          <Link to="/todo" className={location.pathname === '/todo' ? 'active' : ''}>
            <CheckSquare size={20} /> Todo
          </Link>
          <Link to="/habits" className={location.pathname === '/habits' ? 'active' : ''}>
            <Repeat2 size={20} /> Habits
          </Link>
          <Link to="/countdown" className={location.pathname === '/countdown' ? 'active' : ''}>
            <CalendarClock size={20} /> Countdowns
          </Link>
          <Link to="/journal" className={location.pathname === '/journal' ? 'active' : ''}>
            <NotebookPen size={20} /> Journal
          </Link>
          <Link to="/kanban" className={location.pathname === '/kanban' ? 'active' : ''}>
            <Kanban size={20} /> Kanban
          </Link>
          <Link to="/pomodoro" className={location.pathname === '/pomodoro' ? 'active' : ''}>
            <Timer size={20} /> Pomodoro
          </Link>
        </nav>

        <div className="dashboard-user-section">
          <div className="dashboard-user-card">
            <img 
              className="dashboard-user-avatar" 
              src={avatarUrl}
              alt="User" 
            />
            <div className="dashboard-user-info">
              <p className="dashboard-user-name">{user?.fullName || displayName}</p>
              <p className="dashboard-user-level">Learner Profile</p>
            </div>
          </div>
          <div className="dashboard-user-links">
            <Link to="/settings"><Settings size={16} /> Settings</Link>
            <Link to="#"><HelpCircle size={16} /> Help</Link>
            <Link to="#" onClick={(e) => { e.preventDefault(); void logout() }}><LogOut size={16} /> Logout</Link>
          </div>
        </div>
      </aside>

      <main className="dashboard-main kanban-main-wrapper" style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* TopAppBar */}
        <header className="kanban-header">
          <div className="kanban-search-wrapper">
            <Search size={20} className="kanban-search-icon" />
            <input 
              className="kanban-search-input" 
              placeholder="Search projects, tasks, or words..." 
              value={filters.search} 
              onChange={(event) => setFilters({ ...filters, search: event.target.value })} 
              data-testid="kanban-search-input" 
            />
          </div>
          <div className="kanban-header-actions">
            <button className="dashboard-notification-btn">
              <Bell size={24} />
              <span className="dashboard-notification-dot"></span>
            </button>
            <button className="kanban-help-btn">
              <HelpCircle size={24} />
            </button>
          </div>
        </header>

        {/* Content Canvas */}
        <div className="kanban-content">
          {/* Project Header */}
          <section className="kanban-project-header">
            <div className="kanban-project-title-area">
              <nav className="kanban-breadcrumbs">
                <a href="#">Projects</a>
                <ChevronRight size={14} />
                <span>{board?.name || 'Loading...'}</span>
              </nav>
              <h2>{board?.name || 'Study Projects'}</h2>
            </div>
            
            <div className="kanban-project-actions">
              <div className="kanban-avatars">
                <div className="kanban-avatar">
                  <img src={avatarUrl} alt="User" />
                </div>
                <div className="kanban-avatar-count">+3</div>
              </div>
              <button className="kanban-action-btn">
                <Filter size={18} /> Filter
              </button>
              <button className="kanban-action-btn" onClick={() => board && deleteBoard.mutate(board.id)}>
                <Trash2 size={18} /> Delete Board
              </button>
            </div>
          </section>

          {/* Project Selection Tabs */}
          <div className="kanban-board-tabs">
            {boardsQuery.isLoading ? <span style={{ padding: '0 0 12px' }}>Loading boards...</span> : null}
            {boards.map((item) => (
              <button
                key={item.id}
                className={`kanban-tab ${item.id === selectedBoardId ? 'kanban-tab--active' : ''}`}
                onClick={() => setActiveBoardId(item.id)}
              >
                {item.name}
              </button>
            ))}
            
            {/* New Board form replacing the "New Project" button directly */}
            <form className="kanban-new-board-form" onSubmit={submitBoard}>
              <Plus size={16} />
              <input 
                value={boardName} 
                onChange={(event) => setBoardName(event.target.value)} 
                placeholder="New Project" 
                data-testid="kanban-board-name-input" 
                className="kanban-new-board-input"
              />
            </form>
          </div>

          {/* Kanban Board Container */}
          <div className="kanban-board-container" aria-label="Kanban board">
            {!board && !boardsQuery.isLoading ? (
               <div className="empty-panel kanban-empty">
                 <Columns3 size={30} />
                 <h2>No Kanban boards yet</h2>
                 <p>Create a board and FluentA will set up To Do, In Progress, and Done for you.</p>
               </div>
            ) : null}

            {board ? (
              <div className="kanban-columns-scroll">
                {visibleColumns.map((column) => (
                  <div 
                    className="kanban-column-modern" 
                    key={column.id} 
                    data-testid={`kanban-column-${column.name}`}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => handleDrop(event, column.id)}
                  >
                    <div className="kanban-column-header">
                      <div className="kanban-column-title">
                        <input
                          aria-label={`Rename column ${column.name}`}
                          defaultValue={column.name}
                          onBlur={(event) => {
                            if (event.target.value.trim() && event.target.value.trim() !== column.name) {
                              updateColumn.mutate({ boardId: board.id, columnId: column.id, patch: { name: event.target.value } })
                            }
                          }}
                        />
                        <span className="kanban-column-count">{column.cards.length}</span>
                      </div>
                      <button className="kanban-column-menu" onClick={() => deleteColumn.mutate({ boardId: board.id, columnId: column.id })}>
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="kanban-cards-list">
                      {column.cards.map((card) => (
                        <div 
                          className="kanban-card-modern group" 
                          key={card.id} 
                          draggable 
                          onDragStart={() => setDraggedCardId(card.id)} 
                          data-testid={`kanban-card-${card.title}`}
                          onClick={() => openEditor(card)}
                        >
                          <div className="kanban-card-tags-row">
                            <span className="kanban-tag">{card.tags[0] || 'Task'}</span>
                            <span className={`kanban-priority kanban-priority--${card.priority.toLowerCase()}`}>
                              {card.priority === 'High' || card.priority === 'Critical' ? <AlertCircle size={12}/> : <ArrowDown size={12}/>}
                              {card.priority}
                            </span>
                          </div>
                          <h4 className="kanban-card-title">{card.title}</h4>
                          <div className="kanban-card-footer">
                            {card.deadline ? (
                              <div className="kanban-card-date">
                                <CalendarDays size={16} />
                                <span>{deadlineState(card.deadline) === 'overdue' ? `Overdue ${card.deadline}` : card.deadline}</span>
                              </div>
                            ) : <div></div>}
                            <div className="kanban-card-avatar">
                               <img src={avatarUrl} alt="User" />
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      <button 
                        className="kanban-add-card-btn" 
                        onClick={() => {
                          setEditingCard({ id: 'new', columnId: column.id, title: '', description: null, priority: 'Medium', deadline: null, tags: [], sortOrder: column.cards.length, createdAt: new Date().toISOString() } as unknown as kanbanApi.KanbanCard)
                          setEditForm(emptyCardForm(column.id))
                        }}
                      >
                        <Plus size={18} /> Add Card
                      </button>
                    </div>
                  </div>
                ))}

                {/* Add new column form */}
                <form className="kanban-new-column-form" onSubmit={submitColumn}>
                  <input 
                    value={columnName} 
                    onChange={(event) => setColumnName(event.target.value)} 
                    placeholder="New column..." 
                    data-testid="kanban-column-name-input" 
                  />
                  <button type="submit" disabled={!columnName.trim() || createColumn.isPending}>
                    <Plus size={16} />
                  </button>
                </form>

              </div>
            ) : null}
          </div>
        </div>

        {/* Modal for editing/creating card */}
        {editingCard ? (
          <div className="kanban-modal-overlay">
            <form className="kanban-modal-content" onSubmit={submitEdit} aria-label="Edit Kanban card">
              <header className="kanban-modal-header">
                <div>
                  <span className="kanban-modal-label">Card detail</span>
                  <h2>{editingCard.id === 'new' ? 'Create card' : 'Edit card'}</h2>
                </div>
                <button type="button" className="kanban-modal-close" onClick={() => setEditingCard(null)}><X size={20} /></button>
              </header>
              <div className="kanban-modal-body">
                <label>
                  Title
                  <input data-testid="kanban-edit-title-input" value={editForm.title} onChange={(event) => setEditForm({ ...editForm, title: event.target.value })} autoFocus />
                </label>
                <label>
                  Description
                  <textarea value={editForm.description} onChange={(event) => setEditForm({ ...editForm, description: event.target.value })} />
                </label>
                <div className="kanban-modal-row">
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
                </div>
                <label>
                  Tags
                  <input value={editForm.tags} onChange={(event) => setEditForm({ ...editForm, tags: event.target.value })} placeholder="Comma separated" />
                </label>
              </div>
              <footer className="kanban-modal-footer">
                {editingCard.id !== 'new' && (
                  <button type="button" className="kanban-danger-btn" onClick={() => { deleteCard.mutate(editingCard.id); setEditingCard(null); }}>
                    <Trash2 size={16} /> Delete
                  </button>
                )}
                <div style={{flex: 1}}></div>
                <button type="button" className="kanban-secondary-btn" onClick={() => setEditingCard(null)}>Cancel</button>
                <button type="submit" className="kanban-primary-btn" disabled={!editForm.title.trim() || updateCard.isPending || (editingCard.id === 'new' && createCard.isPending)}>Save card</button>
              </footer>
            </form>
          </div>
        ) : null}

        {message ? <p className="flashcard-status flashcard-status--error" style={{ position: 'absolute', bottom: '20px', right: '20px' }}>{message}</p> : null}
        {(boardQuery.isError || boardsQuery.isError) ? <p className="flashcard-status flashcard-status--error" style={{ position: 'absolute', bottom: '20px', right: '20px' }}>Could not load Kanban data.</p> : null}
      </main>
    </div>
  )
}
