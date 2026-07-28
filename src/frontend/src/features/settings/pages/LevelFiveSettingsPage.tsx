import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ArchiveX, Check, ChevronDown, Filter, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SettingsErrorPanel, SettingsLoadingPanel, SettingsPanel } from '../components/SettingsPanel'
import * as reviewApi from '@/features/review'
import { restoreTrashEntry } from '@/features/trash'
import { toast } from '@/lib/toast'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { menuContentClassName, menuItemClassName } from '@/shared/components/ui/menu-styles'
import { cn } from '@/shared/lib/utils'

type FilterMode = 'all' | 'active' | 'inactive'

const filterLabels: Record<FilterMode, string> = {
  all: 'All',
  active: 'Active',
  inactive: 'Inactive',
}

function formatDateOnly(value: string) {
  const [date] = value.split('T')
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString()
}

export function LevelFiveSettingsPage() {
  const queryClient = useQueryClient()
  const selectAllRef = useRef<HTMLInputElement>(null)
  const [filter, setFilter] = useState<FilterMode>('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [removeError, setRemoveError] = useState<string | null>(null)

  const levelFiveQuery = useQuery({ queryKey: ['review', 'level-five'], queryFn: reviewApi.listLevelFiveWords })
  const removeMutation = useMutation({
    mutationFn: reviewApi.removeLevelFiveWords,
    onMutate: () => setRemoveError(null),
    onSuccess: (entries, wordIds) => {
      queryClient.setQueryData(['review', 'level-five'], (current: reviewApi.LevelFiveReviewItem[] | undefined) =>
        current?.filter((item) => !wordIds.includes(item.wordId)) ?? current)
      setSelected([])
      setRemoveError(null)
      toast.success(entries.length === 1 ? 'Word moved to Trash.' : `${entries.length} words moved to Trash.`, {
        action: {
          label: 'Undo',
          onClick: () => {
            void Promise.all(entries.map((entry) => restoreTrashEntry(entry.id)))
              .then(() => queryClient.invalidateQueries({ queryKey: ['review', 'level-five'] }))
              .then(() => toast.success('Words restored at Level 0 for the next local day.'))
              .catch(() => toast.error('Could not restore all selected words.'))
          },
        },
      })
    },
    onError: (error: unknown) => {
      setRemoveError(readApiError(error, 'Unable to remove the selected words.'))
    },
  })

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase()
    return (levelFiveQuery.data ?? []).filter((item) => {
      if (filter !== 'all' && item.status !== filter) return false
      return query.length === 0 || item.word.toLowerCase().includes(query)
    })
  }, [filter, levelFiveQuery.data, search])

  const visibleActiveIds = useMemo(
    () => filteredItems.filter((item) => item.status === 'active').map((item) => item.wordId),
    [filteredItems],
  )
  const visibleSelectedCount = visibleActiveIds.filter((wordId) => selected.includes(wordId)).length
  const allVisibleSelected = visibleActiveIds.length > 0 && visibleSelectedCount === visibleActiveIds.length
  const someVisibleSelected = visibleSelectedCount > 0 && !allVisibleSelected

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someVisibleSelected
  }, [someVisibleSelected])

  function toggleSelected(wordId: string) {
    setSelected((current) => current.includes(wordId)
      ? current.filter((item) => item !== wordId)
      : [...current, wordId])
  }

  function toggleAllVisible() {
    setSelected((current) => allVisibleSelected
      ? current.filter((wordId) => !visibleActiveIds.includes(wordId))
      : [...new Set([...current, ...visibleActiveIds])])
  }

  if (levelFiveQuery.isLoading) return <SettingsLoadingPanel label="Loading Level 5 words" />
  if (levelFiveQuery.isError) return <SettingsErrorPanel message="Unable to load Level 5 words." />

  return (
    <>
      <SettingsPanel
        eyebrow="Review library"
        title="Level 5 words"
        description="Find mastered words and move active ones out of Level 5 without deleting their history."
        badge={<Badge variant="outline">{filteredItems.length} {filteredItems.length === 1 ? 'word' : 'words'}</Badge>}
        footer={(
          <>
            <span className="text-xs text-muted-foreground">
              {selected.length === 0
                ? 'No words selected'
                : `${selected.length} ${selected.length === 1 ? 'word' : 'words'} selected`}
            </span>
            <Button
              id="level-five-remove-selected"
              variant="outline"
              type="button"
              disabled={selected.length === 0 || removeMutation.isPending}
              onClick={() => {
                setRemoveError(null)
                removeMutation.mutate([...selected])
              }}
            >
              <ArchiveX aria-hidden="true" />
              Remove selected
            </Button>
            {removeError ? <span className="text-xs text-destructive" role="alert">{removeError}</span> : null}
          </>
        )}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative min-w-0 flex-1" htmlFor="level-five-search">
            <span className="sr-only">Search Level 5 words</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id="level-five-search"
              className="pl-9"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search words"
            />
          </label>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button
                className="shrink-0 justify-between sm:min-w-36"
                variant="outline"
                type="button"
                aria-label={`Filter Level 5 words, current filter ${filterLabels[filter]}`}
              >
                <Filter aria-hidden="true" />
                Filter: {filterLabels[filter]}
                <ChevronDown aria-hidden="true" />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className={cn(menuContentClassName, 'min-w-40')}
                align="end"
                sideOffset={6}
              >
                <DropdownMenu.RadioGroup value={filter} onValueChange={(value) => setFilter(value as FilterMode)}>
                  {(Object.keys(filterLabels) as FilterMode[]).map((value) => (
                    <DropdownMenu.RadioItem
                      key={value}
                      value={value}
                      className={menuItemClassName}
                    >
                      <span className="grid size-4 place-items-center">
                        <DropdownMenu.ItemIndicator><Check className="size-3.5" aria-hidden="true" /></DropdownMenu.ItemIndicator>
                      </span>
                      {filterLabels[value]}
                    </DropdownMenu.RadioItem>
                  ))}
                </DropdownMenu.RadioGroup>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>

        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[620px] border-collapse text-left text-sm">
            <thead className="bg-muted/45 text-xs font-semibold text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5">Word</th>
                <th className="px-3 py-2.5">Source</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5 text-right">Last review</th>
                <th className="w-12 px-3 py-2.5 text-right">
                  <input
                    ref={selectAllRef}
                    className="size-4 accent-primary"
                    type="checkbox"
                    checked={allVisibleSelected}
                    disabled={visibleActiveIds.length === 0}
                    aria-label="Select all visible active words"
                    onChange={toggleAllVisible}
                  />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredItems.map((item) => (
                <tr key={item.wordId} className={cn(selected.includes(item.wordId) && 'bg-primary/[0.035]')}>
                  <td className="px-3 py-3 font-semibold text-foreground">{item.word}</td>
                  <td className="px-3 py-3 text-muted-foreground">{item.boardName} / {item.pageName}</td>
                  <td className="px-3 py-3">
                    <Badge variant={item.status === 'active' ? 'default' : 'outline'}>{capitalize(item.status)}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-muted-foreground">
                    {item.lastReviewDate ? formatDateOnly(item.lastReviewDate) : '—'}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {item.status === 'active' ? (
                      <input
                        className="size-4 accent-primary"
                        type="checkbox"
                        checked={selected.includes(item.wordId)}
                        aria-label={`Select ${item.word}`}
                        onChange={() => toggleSelected(item.wordId)}
                      />
                    ) : <span className="text-muted-foreground" aria-hidden="true">—</span>}
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-sm text-muted-foreground" colSpan={5}>
                    No Level 5 words match this view.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SettingsPanel>

    </>
  )
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function readApiError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message
  return fallback
}
