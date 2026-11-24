import { ConfirmDeletionDialog } from '@/shared/components/ConfirmDeletionDialog'
import { BookOpenText, FileText, Folder, FolderPlus, PanelLeftClose, PanelLeftOpen, Plus } from 'lucide-react'
import { useEffect, useMemo, useState, type KeyboardEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { RenameEntityDialog } from '@/shared/components/RenameEntityDialog'
import { useAuthStore } from '@/features/auth'
import { BoardSettingsDialog, CreateBoardDialog, CreatePageDialog } from '../components/CreateVocabularyDialog'
import { VocabTable } from '../components/VocabTable'
import { Button } from '@/shared/components/ui/button'
import { Card } from '@/shared/components/ui/card'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/shared/components/ui/context-menu'
import { toast } from '@/shared/lib/toast'
import * as vocabularyApi from '../api/vocabulary.api'
import { vocabularyKeys, refreshLearningAfterVocabularyDeletion } from '../api/vocabulary.queries'
import { cn } from '@/shared/lib/utils'

type DeleteTarget =
  | { kind: 'board'; boardId: string; name: string }
  | { kind: 'page'; boardId: string; pageId: string; name: string }

type BoardSettingsTarget = {
  boardId: string
  name: string
  language: string
  includedOptionalColumns: string[]
}

type RenameBoardTarget = {
  boardId: string
  name: string
  language: string
}

type RenamePageTarget = {
  boardId: string
  pageId: string
  name: string
}

const boardSelectionStorageKey = 'fluenta:vocabulary:selected-board'
const pageSelectionStorageKey = 'fluenta:vocabulary:selected-page'
const sidebarCollapsedStorageKey = 'fluenta:vocabulary:sidebar-collapsed'

function readSessionSelection(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function writeSessionSelection(key: string, value: string | null) {
  if (typeof window === 'undefined') return
  try {
    if (value) window.sessionStorage.setItem(key, value)
    else window.sessionStorage.removeItem(key)
  } catch {
    // Selection persistence is optional; keep the vocabulary workspace usable if storage is unavailable.
  }
}

function vocabularySnapshotKey(userId: string, section: 'boards' | 'board', id?: string) {
  return `fluenta:vocabulary:snapshot:${userId}:${section}${id ? `:${id}` : ''}`
}

function readSessionSnapshot<T>(key: string, normalize: (value: unknown) => T | undefined): T | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    const serialized = window.sessionStorage.getItem(key)
    if (!serialized) return undefined
    const value: unknown = JSON.parse(serialized)
    return normalize(value)
  } catch {
    return undefined
  }
}

function writeSessionSnapshot(key: string, value: unknown) {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Snapshot persistence is optional; keep the vocabulary workspace usable if storage is unavailable.
  }
}

function isBoardSummary(value: unknown): value is vocabularyApi.BoardSummary {
  return typeof value === 'object' && value !== null
    && typeof (value as vocabularyApi.BoardSummary).id === 'string'
    && typeof (value as vocabularyApi.BoardSummary).name === 'string'
    && typeof (value as vocabularyApi.BoardSummary).createdAt === 'string'
}

function isBoardSummaries(value: unknown): value is vocabularyApi.BoardSummary[] {
  return Array.isArray(value) && value.every(isBoardSummary)
}

function normalizeBoardSummaries(value: unknown): vocabularyApi.BoardSummary[] | undefined {
  return isBoardSummaries(value) ? value : undefined
}

const legacyColumnKeys: Record<string, string> = {
  meaningVn: 'meaning',
  class: 'type',
  definition: 'context',
}

function normalizeColumnKey(key: string) {
  if (key === 'note') return null
  return legacyColumnKeys[key] ?? key
}

function normalizeColumnKeys(value: unknown) {
  if (!Array.isArray(value) || !value.every((key) => typeof key === 'string')) return undefined
  const normalized: string[] = []
  for (const key of value) {
    const mappedKey = normalizeColumnKey(key)
    if (mappedKey && !normalized.includes(mappedKey)) normalized.push(mappedKey)
  }
  return normalized
}

function normalizeColumnWidths(value: unknown) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const normalized: Record<string, number> = {}
  for (const [key, width] of Object.entries(value)) {
    const mappedKey = normalizeColumnKey(key)
    if (!mappedKey || typeof width !== 'number' || !Number.isFinite(width)) continue
    if (!(mappedKey in normalized) || mappedKey === key) normalized[mappedKey] = width
  }
  return normalized
}

function normalizeBoardPreferences(value: unknown): vocabularyApi.BoardPreferences | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const preferences = value as vocabularyApi.BoardPreferences
  const hiddenColumns = normalizeColumnKeys(preferences.hiddenColumns)
  const columnOrder = normalizeColumnKeys(preferences.columnOrder)
  const columnWidths = normalizeColumnWidths(preferences.columnWidths)
  if (!hiddenColumns || !columnOrder || !columnWidths) return undefined
  return { ...preferences, hiddenColumns, columnOrder, columnWidths }
}

function normalizeBoardDetail(value: unknown): vocabularyApi.BoardDetail | undefined {
  if (!isBoardSummary(value)) return undefined
  const detail = value as vocabularyApi.BoardDetail
  if (!Array.isArray(detail.pages)
    || !detail.pages.every((page) => typeof page?.id === 'string' && typeof page.name === 'string')) return undefined
  const preferences = normalizeBoardPreferences(detail.preferences)
  return preferences ? { ...detail, preferences } : undefined
}

function newestFirst<T extends { createdAt: string; id: string }>(items: T[]) {
  return items.toSorted((left, right) => right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id))
}

function focusVerticalTab<T extends { id: string }>(
  event: KeyboardEvent<HTMLButtonElement>,
  items: T[],
  currentId: string,
  idPrefix: string,
  onSelect: (id: string) => void,
) {
  if (items.length === 0) return

  const currentIndex = items.findIndex((item) => item.id === currentId)
  const nextIndex = event.key === 'Home'
    ? 0
    : event.key === 'End'
      ? items.length - 1
      : event.key === 'ArrowDown'
        ? (currentIndex + 1) % items.length
        : event.key === 'ArrowUp'
          ? (currentIndex - 1 + items.length) % items.length
          : -1

  if (nextIndex < 0) return

  event.preventDefault()
  const nextId = items[nextIndex].id
  onSelect(nextId)
  requestAnimationFrame(() => document.getElementById(`${idPrefix}-${nextId}`)?.focus())
}

export function WorkspacePage() {
  const queryClient = useQueryClient()
  const userId = useAuthStore((state) => state.user?.id)
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(() => readSessionSelection(boardSelectionStorageKey))
  const [selectedPageId, setSelectedPageId] = useState<string | null>(() => readSessionSelection(pageSelectionStorageKey))
  const [isCreatingBoard, setIsCreatingBoard] = useState(false)
  const [createPageBoardTarget, setCreatePageBoardTarget] = useState<{ id: string; name: string } | null>(null)
  const [boardSettingsTarget, setBoardSettingsTarget] = useState<BoardSettingsTarget | null>(null)
  const [renameBoardTarget, setRenameBoardTarget] = useState<RenameBoardTarget | null>(null)
  const [renamePageTarget, setRenamePageTarget] = useState<RenamePageTarget | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [wordSearch, setWordSearch] = useState('')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => readSessionSelection(sidebarCollapsedStorageKey) === 'true')

  const boardsQuery = useQuery({
    queryKey: vocabularyKeys.boards,
    queryFn: vocabularyApi.listBoards,
    initialData: () => userId
      ? readSessionSnapshot(vocabularySnapshotKey(userId, 'boards'), normalizeBoardSummaries)
      : undefined,
  })
  const boards = useMemo(() => boardsQuery.data ?? [], [boardsQuery.data])
  const sortedBoards = useMemo(
    () => newestFirst(boards),
    [boards],
  )
  const activeBoardId = sortedBoards.some((board) => board.id === selectedBoardId) ? selectedBoardId : sortedBoards[0]?.id ?? null

  const boardQuery = useQuery({
    queryKey: vocabularyKeys.board(activeBoardId),
    queryFn: () => vocabularyApi.getBoard(activeBoardId!),
    enabled: Boolean(activeBoardId),
    initialData: () => userId && activeBoardId
      ? readSessionSnapshot(vocabularySnapshotKey(userId, 'board', activeBoardId), normalizeBoardDetail)
      : undefined,
  })

  const activeBoard = boardQuery.data
  const sortedPages = useMemo(
    () => newestFirst(activeBoard?.pages ?? []),
    [activeBoard?.pages],
  )
  const activePage = sortedPages.find((page) => page.id === selectedPageId) ?? sortedPages[0] ?? null

  useEffect(() => {
    if (!boardsQuery.isSuccess) return
    writeSessionSelection(boardSelectionStorageKey, activeBoardId)
  }, [activeBoardId, boardsQuery.isSuccess])

  useEffect(() => {
    if (!boardQuery.isSuccess) return
    writeSessionSelection(pageSelectionStorageKey, activePage?.id ?? null)
  }, [activePage?.id, boardQuery.isSuccess])

  useEffect(() => {
    if (userId && boardsQuery.data) {
      writeSessionSnapshot(vocabularySnapshotKey(userId, 'boards'), boardsQuery.data)
    }
  }, [boardsQuery.data, userId])

  useEffect(() => {
    if (userId && activeBoard) {
      writeSessionSnapshot(vocabularySnapshotKey(userId, 'board', activeBoard.id), activeBoard)
    }
  }, [activeBoard, userId])

  useEffect(() => {
    writeSessionSelection(sidebarCollapsedStorageKey, isSidebarCollapsed ? 'true' : 'false')
  }, [isSidebarCollapsed])

  const createBoard = useMutation({
    mutationFn: vocabularyApi.createBoard,
    onSuccess: async (board) => {
      queryClient.setQueryData(vocabularyKeys.board(board.id), board)
      setSelectedBoardId(board.id)
      setSelectedPageId(null)
      setWordSearch('')
      setIsCreatingBoard(false)
      toast.success('Board created successfully')
      await queryClient.invalidateQueries({ queryKey: vocabularyKeys.boards })
    },
  })

  const createPage = useMutation({
    mutationFn: (input: { boardId: string; name: string }) => vocabularyApi.createPage(input.boardId, { name: input.name }),
    onSuccess: async (page, input) => {
      setSelectedBoardId(input.boardId)
      setSelectedPageId(page.id)
      setWordSearch('')
      setCreatePageBoardTarget(null)
      toast.success('Page created successfully')
      await queryClient.invalidateQueries({ queryKey: vocabularyKeys.boards })
      await queryClient.invalidateQueries({ queryKey: vocabularyKeys.board(input.boardId) })
    },
  })

  const updatePreferences = useMutation({
    mutationFn: (input: { boardId: string; preferences: vocabularyApi.BoardPreferences }) => vocabularyApi.updateBoardPreferences(input.boardId, {
      hiddenColumns: input.preferences.hiddenColumns,
      columnOrder: input.preferences.columnOrder,
      columnWidths: input.preferences.columnWidths,
    }),
    onSuccess: (preferences, input) => {
      queryClient.setQueryData<vocabularyApi.BoardDetail | undefined>(
        vocabularyKeys.board(input.boardId),
        (current) => (current ? { ...current, preferences } : current),
      )
    },
  })

  const renameBoard = useMutation({
    mutationFn: (input: { target: RenameBoardTarget; name: string }) =>
      vocabularyApi.updateBoard(input.target.boardId, {
        name: input.name,
        language: input.target.language,
      }),
    onSuccess: (board) => {
      queryClient.setQueryData<vocabularyApi.BoardSummary[]>(vocabularyKeys.boards, (current = []) =>
        current.map((item) => (item.id === board.id
          ? { ...item, name: board.name, language: board.language, updatedAt: board.updatedAt }
          : item)),
      )
      queryClient.setQueryData<vocabularyApi.BoardDetail>(vocabularyKeys.board(board.id), board)
      setRenameBoardTarget(null)
      toast.success('Board renamed successfully')
    },
  })

  const updateBoardSettings = useMutation({
    mutationFn: (input: { target: BoardSettingsTarget; language: string; includedOptionalColumns: string[] }) =>
      vocabularyApi.updateBoard(input.target.boardId, {
        name: input.target.name,
        language: input.language,
        includedOptionalColumns: input.includedOptionalColumns,
      }),
    onSuccess: (board) => {
      queryClient.setQueryData<vocabularyApi.BoardSummary[]>(vocabularyKeys.boards, (current = []) =>
        current.map((item) => (item.id === board.id
          ? { ...item, name: board.name, language: board.language, updatedAt: board.updatedAt }
          : item)),
      )
      queryClient.setQueryData<vocabularyApi.BoardDetail>(vocabularyKeys.board(board.id), board)
      setBoardSettingsTarget(null)
      toast.success('Board settings updated')
    },
  })

  const renamePage = useMutation({
    mutationFn: (input: { target: RenamePageTarget; name: string }) =>
      vocabularyApi.updatePage(input.target.pageId, { name: input.name }),
    onSuccess: (page, input) => {
      queryClient.setQueryData<vocabularyApi.BoardDetail | undefined>(
        vocabularyKeys.board(input.target.boardId),
        (board) => (board
          ? { ...board, pages: board.pages.map((item) => (item.id === page.id ? page : item)) }
          : board),
      )
      setRenamePageTarget(null)
      toast.success('Page renamed successfully')
    },
  })

  const deleteBoard = useMutation({
    mutationFn: (target: Extract<DeleteTarget, { kind: 'board' }>) => vocabularyApi.deleteBoard(target.boardId),
    onSuccess: (_, target) => {
      const remainingBoards = newestFirst(
        (queryClient.getQueryData<vocabularyApi.BoardSummary[]>(vocabularyKeys.boards) ?? [])
          .filter((board) => board.id !== target.boardId),
      )
      const deletedBoard = queryClient.getQueryData<vocabularyApi.BoardDetail>(vocabularyKeys.board(target.boardId))
      queryClient.setQueryData(vocabularyKeys.boards, remainingBoards)
      queryClient.removeQueries({ queryKey: vocabularyKeys.board(target.boardId), exact: true })
      for (const page of deletedBoard?.pages ?? []) {
        queryClient.removeQueries({ queryKey: vocabularyKeys.words(page.id), exact: true })
      }
      setSelectedBoardId(remainingBoards[0]?.id ?? null)
      setSelectedPageId(null)
      requestAnimationFrame(() => document.getElementById(remainingBoards[0] ? `vocabulary-board-tab-${remainingBoards[0].id}` : 'vocabulary-add-board')?.focus())
      setDeleteTarget(null)
      refreshLearningAfterVocabularyDeletion(queryClient)
      toast.success('Board deleted.')
      void queryClient.invalidateQueries({ queryKey: vocabularyKeys.boards })
    },
  })

  const deletePage = useMutation({
    mutationFn: (target: Extract<DeleteTarget, { kind: 'page' }>) => vocabularyApi.deletePage(target.pageId),
    onSuccess: (_, target) => {
      const boardKey = vocabularyKeys.board(target.boardId)
      const current = queryClient.getQueryData<vocabularyApi.BoardDetail>(boardKey)
      const remainingPages = newestFirst((current?.pages ?? []).filter((page) => page.id !== target.pageId))
      queryClient.setQueryData<vocabularyApi.BoardDetail | undefined>(boardKey, (board) => (board ? { ...board, pages: remainingPages } : board))
      queryClient.removeQueries({ queryKey: vocabularyKeys.words(target.pageId), exact: true })
      setSelectedPageId(remainingPages[0]?.id ?? null)
      requestAnimationFrame(() => document.getElementById(remainingPages[0] ? `vocabulary-page-tab-${remainingPages[0].id}` : 'vocabulary-add-page')?.focus())
      setDeleteTarget(null)
      refreshLearningAfterVocabularyDeletion(queryClient)
      toast.success('Page deleted.')
      void queryClient.invalidateQueries({ queryKey: vocabularyKeys.boards })
      void queryClient.invalidateQueries({ queryKey: boardKey })
    },
  })

  function selectBoard(boardId: string) {
    setSelectedBoardId(boardId)
    setSelectedPageId(null)
    setCreatePageBoardTarget(null)
    setWordSearch('')
  }

  function selectPage(pageId: string) {
    setSelectedPageId(pageId)
    setWordSearch('')
  }

  function openCreateBoardDialog() {
    createBoard.reset()
    setIsCreatingBoard(true)
  }

  function openCreatePageDialog(board: { id: string; name: string }) {
    createPage.reset()
    setCreatePageBoardTarget({ id: board.id, name: board.name })
  }

  async function openBoardSettingsDialog(board: vocabularyApi.BoardSummary) {
    updateBoardSettings.reset()
    try {
      const detail = await queryClient.fetchQuery({
        queryKey: vocabularyKeys.board(board.id),
        queryFn: () => vocabularyApi.getBoard(board.id),
        staleTime: 0,
      })
      setBoardSettingsTarget({
        boardId: detail.id,
        name: detail.name,
        language: detail.language,
        includedOptionalColumns: vocabularyApi.OPTIONAL_VOCAB_COLUMNS
          .filter(({ key }) => !detail.preferences.hiddenColumns.includes(key))
          .map(({ key }) => key),
      })
    } catch {
      toast.error('Could not load this board right now.')
    }
  }

  return (
    <>
      <div className="flex h-full min-h-0 min-w-0 flex-col bg-background md:flex-row">
        <aside
          aria-label="Vocabulary boards"
          data-testid="vocabulary-boards-rail"
          data-collapsed={isSidebarCollapsed ? 'true' : 'false'}
          className={cn(
            'flex shrink-0 border-b border-border bg-card transition-[width] duration-200 md:h-full md:max-h-none md:border-b-0 md:border-r',
            isSidebarCollapsed
              ? 'w-full flex-row items-center gap-2 overflow-x-auto px-3 py-2 md:w-[56px] md:flex-col md:items-center md:gap-3 md:overflow-x-hidden md:overflow-y-auto md:px-2 md:py-[22px]'
              : 'max-h-60 w-full flex-col gap-[14px] overflow-y-auto px-[18px] py-[22px] md:w-[260px]',
          )}
        >
          {isSidebarCollapsed ? (
            <div className="flex shrink-0 items-center gap-1.5 md:flex-col">
              <button
                type="button"
                data-testid="vocabulary-sidebar-toggle"
                aria-label="Expand sidebar"
                aria-expanded={false}
                title="Expand sidebar"
                onClick={() => setIsSidebarCollapsed(false)}
                className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-[8px] bg-muted text-foreground/80 transition-colors hover:bg-secondary hover:text-secondary-foreground"
              >
                <PanelLeftOpen className="size-[15px]" aria-hidden="true" />
              </button>
              <button
                id="vocabulary-add-board"
                type="button"
                aria-label="New board"
                title="New board"
                onClick={openCreateBoardDialog}
                className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-[8px] bg-muted text-foreground/80 transition-colors hover:bg-secondary hover:text-secondary-foreground"
              >
                <Plus className="size-[15px]" aria-hidden="true" />
              </button>
              <div className="h-5 w-px shrink-0 bg-border md:h-px md:w-6" aria-hidden="true" />
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase leading-[18px] tracking-[0.7px] text-muted-foreground">
                BOARDS
              </span>
              <div className="flex items-center gap-1">
                <button
                  id="vocabulary-add-board"
                  type="button"
                  aria-label="New board"
                  title="New board"
                  onClick={openCreateBoardDialog}
                  className="inline-flex cursor-pointer items-center justify-center rounded-[6px] bg-muted px-[6px] py-[4px] text-foreground/80 transition-colors hover:bg-secondary hover:text-secondary-foreground"
                >
                  <Plus className="size-[14px]" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  data-testid="vocabulary-sidebar-toggle"
                  aria-label="Collapse sidebar"
                  aria-expanded={true}
                  title="Collapse sidebar"
                  onClick={() => setIsSidebarCollapsed(true)}
                  className="inline-flex cursor-pointer items-center justify-center rounded-[6px] bg-muted px-[6px] py-[4px] text-foreground/80 transition-colors hover:bg-secondary hover:text-secondary-foreground"
                >
                  <PanelLeftClose className="size-[14px]" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          <div
            role="tablist"
            aria-label="Vocabulary boards"
            aria-orientation="vertical"
            className={cn(
              'flex',
              isSidebarCollapsed ? 'flex-row items-center gap-1.5 md:flex-col' : 'flex-col gap-[6px]',
            )}
          >
            {sortedBoards.map((board) => {
              const isActiveBoard = activeBoardId === board.id
              return (
                <div key={board.id} className="flex flex-col">
                  <ContextMenu>
                    <ContextMenuTrigger asChild>
                      {isSidebarCollapsed ? (
                        <button
                          id={`vocabulary-board-tab-${board.id}`}
                          type="button"
                          role="tab"
                          aria-selected={isActiveBoard}
                          aria-label={board.name}
                          tabIndex={isActiveBoard ? 0 : -1}
                          title={board.name}
                          onClick={() => selectBoard(board.id)}
                          onKeyDown={(event) => focusVerticalTab(event, sortedBoards, board.id, 'vocabulary-board-tab', selectBoard)}
                          className={cn(
                            'inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-[8px] transition-colors',
                            isActiveBoard
                              ? 'bg-secondary text-primary'
                              : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                          )}
                        >
                          <Folder className="size-[16px]" aria-hidden="true" />
                        </button>
                      ) : (
                        <div
                          className={cn(
                            'flex items-center justify-between gap-2 rounded-[8px] px-[8px] py-[6px] transition-colors hover:bg-muted/50',
                            isActiveBoard && 'bg-muted/35',
                          )}
                        >
                          <button
                            id={`vocabulary-board-tab-${board.id}`}
                            type="button"
                            role="tab"
                            aria-selected={isActiveBoard}
                            tabIndex={isActiveBoard ? 0 : -1}
                            title={board.name}
                            onClick={() => selectBoard(board.id)}
                            onKeyDown={(event) => focusVerticalTab(event, sortedBoards, board.id, 'vocabulary-board-tab', selectBoard)}
                            className="flex min-w-0 flex-1 cursor-pointer items-center gap-[8px] border-0 bg-transparent p-0 text-left"
                          >
                            <Folder
                              className={cn('size-[15px] shrink-0', isActiveBoard ? 'text-primary' : 'text-muted-foreground')}
                              aria-hidden="true"
                            />
                            <span
                              className={cn(
                                'truncate text-[13px] font-bold leading-[18px]',
                                isActiveBoard ? 'text-foreground' : 'text-[#3d4f4b]',
                              )}
                            >
                              {board.name}
                            </span>
                          </button>
                          <button
                            id={isActiveBoard ? 'vocabulary-add-page' : undefined}
                            type="button"
                            aria-label={isActiveBoard ? 'New page' : `New page in ${board.name}`}
                            title={`Add page to ${board.name}`}
                            onClick={() => openCreatePageDialog(board)}
                            className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-[6px] bg-muted px-[6px] py-[4px] text-foreground/75 transition-colors hover:bg-secondary hover:text-secondary-foreground"
                          >
                            <Plus className="size-[14px]" aria-hidden="true" />
                          </button>
                        </div>
                      )}
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem
                        onSelect={() => {
                          renameBoard.reset()
                          setRenameBoardTarget({ boardId: board.id, name: board.name, language: board.language })
                        }}
                      >
                        Rename
                      </ContextMenuItem>
                      <ContextMenuItem onSelect={() => { void openBoardSettingsDialog(board) }}>
                        Setting
                      </ContextMenuItem>
                      <ContextMenuItem
                        className="text-destructive focus:text-destructive"
                        onSelect={() => {
                          deleteBoard.reset()
                          setDeleteTarget({ kind: 'board', boardId: board.id, name: board.name })
                        }}
                      >
                        Delete
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>

                  {!isSidebarCollapsed && isActiveBoard && activeBoard ? (
                    <div
                      role="tablist"
                      aria-label={`${activeBoard.name} pages`}
                      aria-orientation="vertical"
                      className="mt-[4px] flex flex-col gap-[4px]"
                    >
                      {sortedPages.map((page) => {
                        const isActivePage = activePage?.id === page.id
                        return (
                          <ContextMenu key={page.id}>
                            <ContextMenuTrigger asChild>
                              <button
                                id={`vocabulary-page-tab-${page.id}`}
                                type="button"
                                role="tab"
                                aria-selected={isActivePage}
                                tabIndex={isActivePage ? 0 : -1}
                                title={page.name}
                                onClick={() => selectPage(page.id)}
                                onKeyDown={(event) => focusVerticalTab(event, sortedPages, page.id, 'vocabulary-page-tab', selectPage)}
                                className={cn(
                                  'flex w-full min-w-0 cursor-pointer items-center gap-[8px] rounded-[8px] py-[8px] pl-[14px] pr-[10px] text-left transition-colors',
                                  isActivePage
                                    ? 'bg-secondary text-secondary-foreground'
                                    : 'text-[#3d4f4b] hover:bg-muted/60 hover:text-foreground',
                                )}
                              >
                                <FileText
                                  className={cn(
                                    'size-[14px] shrink-0',
                                    isActivePage ? 'text-secondary-foreground' : 'text-muted-foreground',
                                  )}
                                  aria-hidden="true"
                                />
                                <span className="truncate text-[13px] font-semibold leading-[18px]">{page.name}</span>
                              </button>
                            </ContextMenuTrigger>
                            <ContextMenuContent>
                              <ContextMenuItem
                                onSelect={() => {
                                  renamePage.reset()
                                  setRenamePageTarget({ boardId: activeBoard.id, pageId: page.id, name: page.name })
                                }}
                              >
                                Rename
                              </ContextMenuItem>
                              <ContextMenuItem
                                className="text-destructive focus:text-destructive"
                                onSelect={() => {
                                  deletePage.reset()
                                  setDeleteTarget({ kind: 'page', boardId: activeBoard.id, pageId: page.id, name: page.name })
                                }}
                              >
                                Delete
                              </ContextMenuItem>
                            </ContextMenuContent>
                          </ContextMenu>
                        )
                      })}
                      {!boardQuery.isLoading && sortedPages.length === 0 ? (
                        <p className="m-0 py-1.5 pl-[14px] text-xs text-muted-foreground">No pages yet</p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )
            })}

            {!isSidebarCollapsed && boardsQuery.isSuccess && sortedBoards.length === 0 ? (
              <p className="m-0 px-2 py-1 text-xs text-muted-foreground">No boards yet.</p>
            ) : null}
          </div>
        </aside>

        <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-[18px] overflow-hidden bg-background px-5 py-5 lg:px-[36px] lg:py-[28px]">
          {activeBoard && activePage ? (
            <>
              <h2 className="m-0 shrink-0 truncate text-[24px] font-bold leading-[32px] tracking-[-0.01em] text-foreground">
                {activePage.name}
              </h2>
              <VocabTable
                key={activePage.id}
                page={activePage}
                boardLanguage={activeBoard.language}
                preferences={activeBoard.preferences}
                searchTerm={wordSearch}
                onSearchChange={setWordSearch}
                preferencesBusy={updatePreferences.isPending || updateBoardSettings.isPending || renameBoard.isPending}
                onPreferencesChange={async (preferences) => {
                  await updatePreferences.mutateAsync({ boardId: activeBoard.id, preferences })
                }}
              />
            </>
          ) : activeBoard ? (
            <Card className="grid min-h-0 flex-1 place-content-center rounded-[12px] border-border bg-card text-center">
              <FileText className="mx-auto mb-3 size-10 text-muted-foreground" />
              <h2 className="m-0 text-lg font-semibold">This board has no pages</h2>
              <p className="m-0 mt-2 text-sm text-muted-foreground">Create a page, then add your first vocabulary row.</p>
              <Button className="mx-auto mt-5" onClick={() => openCreatePageDialog(activeBoard)}>
                <Plus /> Create page
              </Button>
            </Card>
          ) : boardsQuery.isLoading && boards.length === 0 ? (
            <Card className="grid min-h-0 flex-1 place-content-center rounded-[12px] border-border bg-card text-center" role="status" data-testid="vocabulary-loading-state">
              <p className="m-0 text-sm text-muted-foreground">Loading your vocabulary boards...</p>
            </Card>
          ) : boardsQuery.isError && boards.length === 0 ? (
            <Card className="grid min-h-0 flex-1 place-content-center rounded-[12px] border-border bg-card text-center" role="alert">
              <h2 className="m-0 text-lg font-semibold">Could not load your vocabulary boards</h2>
              <p className="m-0 mt-2 text-sm text-muted-foreground">Check your connection and try again.</p>
              <Button className="mx-auto mt-5" onClick={() => { void boardsQuery.refetch() }}>Retry</Button>
            </Card>
          ) : activeBoardId && boardQuery.isLoading ? (
            <Card className="grid min-h-0 flex-1 place-content-center rounded-[12px] border-border bg-card text-center" role="status" data-testid="vocabulary-loading-state">
              <p className="m-0 text-sm text-muted-foreground">Loading your vocabulary board...</p>
            </Card>
          ) : activeBoardId && boardQuery.isError ? (
            <Card className="grid min-h-0 flex-1 place-content-center rounded-[12px] border-border bg-card text-center" role="alert">
              <h2 className="m-0 text-lg font-semibold">Could not load this vocabulary board</h2>
              <p className="m-0 mt-2 text-sm text-muted-foreground">Check your connection and try again.</p>
              <Button className="mx-auto mt-5" onClick={() => { void boardQuery.refetch() }}>Retry</Button>
            </Card>
          ) : (
            <Card className="grid min-h-0 flex-1 place-content-center rounded-[12px] border-border bg-card text-center">
              <BookOpenText className="mx-auto mb-4 size-12 text-muted-foreground" />
              <h2 className="m-0 text-xl font-semibold">Select or create a vocabulary board</h2>
              <p className="m-0 mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                Boards keep related pages and learning material together.
              </p>
              <Button className="mx-auto mt-5" onClick={openCreateBoardDialog}>
                <FolderPlus /> Create board
              </Button>
            </Card>
          )}
        </section>
      </div>

      {isCreatingBoard ? (
        <CreateBoardDialog
          pending={createBoard.isPending}
          error={createBoard.isError ? 'Could not create the board right now.' : null}
          onOpenChange={(open) => {
            if (!open) {
              setIsCreatingBoard(false)
              createBoard.reset()
            }
          }}
          onConfirm={(name, language, includedOptionalColumns) => createBoard.mutate({ name, language, includedOptionalColumns })}
        />
      ) : null}

      {createPageBoardTarget ? (
        <CreatePageDialog
          boardName={createPageBoardTarget.name}
          pending={createPage.isPending}
          error={createPage.isError ? 'Could not create the page right now.' : null}
          onOpenChange={(open) => {
            if (!open) {
              setCreatePageBoardTarget(null)
              createPage.reset()
            }
          }}
          onConfirm={(name) => createPage.mutate({ boardId: createPageBoardTarget.id, name })}
        />
      ) : null}

      {boardSettingsTarget ? (
        <BoardSettingsDialog
          key={boardSettingsTarget.boardId}
          boardName={boardSettingsTarget.name}
          initialLanguage={boardSettingsTarget.language}
          initialIncludedOptionalColumns={boardSettingsTarget.includedOptionalColumns}
          pending={updateBoardSettings.isPending || updatePreferences.isPending}
          error={updateBoardSettings.isError ? 'Could not save board settings right now.' : null}
          onOpenChange={(open) => {
            if (!open) {
              setBoardSettingsTarget(null)
              updateBoardSettings.reset()
            }
          }}
          onConfirm={(language, includedOptionalColumns) =>
            updateBoardSettings.mutate({ target: boardSettingsTarget, language, includedOptionalColumns })
          }
        />
      ) : null}

      {renameBoardTarget ? (
        <RenameEntityDialog
          key={`board-${renameBoardTarget.boardId}`}
          entity="Board"
          initialName={renameBoardTarget.name}
          maxLength={120}
          pending={renameBoard.isPending}
          error={renameBoard.isError ? 'Could not rename this board right now.' : null}
          onOpenChange={(open) => {
            if (!open) {
              setRenameBoardTarget(null)
              renameBoard.reset()
            }
          }}
          onConfirm={(name) => renameBoard.mutate({ target: renameBoardTarget, name })}
        />
      ) : null}

      {renamePageTarget ? (
        <RenameEntityDialog
          key={`page-${renamePageTarget.pageId}`}
          entity="Page"
          initialName={renamePageTarget.name}
          maxLength={120}
          pending={renamePage.isPending}
          error={renamePage.isError ? 'Could not rename this page right now.' : null}
          onOpenChange={(open) => {
            if (!open) {
              setRenamePageTarget(null)
              renamePage.reset()
            }
          }}
          onConfirm={(name) => renamePage.mutate({ target: renamePageTarget, name })}
        />
      ) : null}

      <ConfirmDeletionDialog
        name={deleteTarget?.name ?? null}
        pending={deleteBoard.isPending || deletePage.isPending}
        error={deleteBoard.isError || deletePage.isError}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget?.kind === 'board') deleteBoard.mutate(deleteTarget)
          else if (deleteTarget) deletePage.mutate(deleteTarget)
        }}
      />
    </>
  )
}
