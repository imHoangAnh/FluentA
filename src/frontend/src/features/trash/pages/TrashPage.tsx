import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CircleAlert, Inbox, LoaderCircle, RotateCcw, Search, Trash2 } from 'lucide-react'
import { toast } from '@/lib/toast'
import { AlertDialog, AlertDialogActionButton, AlertDialogCancelButton, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from '@/shared/components/ui/alert-dialog'
import { Alert } from '@/shared/components/ui/alert'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { bulkPermanentlyDeleteTrashEntries, bulkRestoreTrashEntries, emptyTrash, listTrash, permanentlyDeleteTrashEntry, restoreTrashEntry, type TrashEntry } from '../api/trash.api'

function displayDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function timeRemaining(value: string) {
  const milliseconds = Math.max(0, new Date(value).getTime() - Date.now())
  const days = Math.floor(milliseconds / 86_400_000)
  const hours = Math.floor((milliseconds % 86_400_000) / 3_600_000)
  return days > 0 ? `${days} day${days === 1 ? '' : 's'} left` : `${hours} hour${hours === 1 ? '' : 's'} left`
}

type DeleteIntent = { kind: 'one'; item: TrashEntry } | { kind: 'selected' } | { kind: 'empty' }

export function TrashPage() {
  const queryClient = useQueryClient()
  const [type, setType] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [deleteIntent, setDeleteIntent] = useState<DeleteIntent | null>(null)
  const query = useQuery({ queryKey: ['trash', type, search], queryFn: () => listTrash(type || undefined, search || undefined) })
  const items = query.data ?? []
  const selectedIds = useMemo(() => selected.filter((id) => items.some((item) => item.id === id)), [items, selected])
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['trash'] })
  const restore = useMutation({ mutationFn: restoreTrashEntry, onSuccess: () => { refresh(); toast.success('Item restored. Reminders are not restored.') }, onError: () => toast.error('Could not restore this item.') })
  const permanentlyDelete = useMutation({ mutationFn: permanentlyDeleteTrashEntry, onSuccess: () => { setDeleteIntent(null); refresh(); toast.success('Item permanently deleted.') }, onError: () => toast.error('Could not permanently delete this item.') })
  const bulkRestore = useMutation({ mutationFn: bulkRestoreTrashEntries, onSuccess: () => { setSelected([]); refresh(); toast.success('Selected items restored.') }, onError: () => toast.error('Could not restore every selected item.') })
  const bulkDelete = useMutation({ mutationFn: bulkPermanentlyDeleteTrashEntries, onSuccess: () => { setDeleteIntent(null); setSelected([]); refresh(); toast.success('Selected items permanently deleted.') }, onError: () => toast.error('Could not permanently delete every selected item.') })
  const empty = useMutation({ mutationFn: emptyTrash, onSuccess: () => { setDeleteIntent(null); setSelected([]); refresh(); toast.success('Trash emptied.') }, onError: () => toast.error('Could not empty Trash.') })
  const pending = restore.isPending || permanentlyDelete.isPending || bulkRestore.isPending || bulkDelete.isPending || empty.isPending
  const confirmDelete = () => {
    if (!deleteIntent) return
    if (deleteIntent.kind === 'one') permanentlyDelete.mutate(deleteIntent.item.id)
    else if (deleteIntent.kind === 'selected') bulkDelete.mutate(selectedIds)
    else empty.mutate()
  }
  const deleteDescription = deleteIntent?.kind === 'one' ? `Delete “${deleteIntent.item.displayName}” permanently? Included descendants are deleted too. This cannot be undone.` : deleteIntent?.kind === 'selected' ? `Permanently delete ${selectedIds.length} selected root item(s), including their descendants? This cannot be undone.` : 'Permanently delete every item in Trash, including descendants? This cannot be undone.'

  return <>
    <Card>
      <CardHeader className="border-b border-border"><CardTitle>Trash</CardTitle><CardDescription>Items stay here for 30 days. Restore returns an item to its original location; permanent deletion cannot be undone.</CardDescription></CardHeader>
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-col gap-3 sm:flex-row"><label className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" /><span className="sr-only">Search Trash</span><input className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm" placeholder="Search deleted items" value={search} onChange={(event) => { setSearch(event.target.value); setSelected([]) }} /></label><select aria-label="Filter by module" className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={type} onChange={(event) => { setType(event.target.value); setSelected([]) }}><option value="">All modules</option>{['Todo', 'Note', 'Vocabulary', 'LevelFive', 'Journal', 'Countdown', 'Habit', 'Kanban'].map((kind) => <option key={kind} value={kind}>{kind}</option>)}</select></div>
        {selectedIds.length ? <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/30 p-3 text-sm"><span>{selectedIds.length} selected</span><Button size="sm" variant="outline" disabled={pending} onClick={() => bulkRestore.mutate(selectedIds)}><RotateCcw /> Restore selected</Button><Button size="sm" variant="destructive" disabled={pending} onClick={() => setDeleteIntent({ kind: 'selected' })}><Trash2 /> Delete selected</Button></div> : null}
        {items.length ? <div className="flex justify-end"><Button size="sm" variant="ghost" disabled={pending} onClick={() => setDeleteIntent({ kind: 'empty' })}><Trash2 /> Empty Trash</Button></div> : null}
        {query.isLoading ? <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground" aria-busy="true"><LoaderCircle className="size-4 animate-spin" /> Loading Trash…</div> : null}
        {query.isError ? <Alert className="border-destructive/30 bg-destructive/5 text-destructive"><CircleAlert className="mr-2 inline size-4" />Could not load Trash. Please retry.</Alert> : null}
        {!query.isLoading && !query.isError && !items.length ? <div className="grid place-items-center gap-2 py-12 text-center"><Inbox className="size-8 text-muted-foreground" /><p className="m-0 font-medium">Trash is empty.</p><p className="m-0 text-sm text-muted-foreground">Deleted items will appear here before they are permanently removed.</p></div> : null}
        {!query.isLoading && !query.isError && items.length ? <><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selectedIds.length === items.length} onChange={(event) => setSelected(event.target.checked ? items.map((item) => item.id) : [])} /> Select all shown</label><ul className="m-0 divide-y divide-border border-y border-border p-0" aria-label="Trashed items">{items.map((item) => { const restoring = restore.isPending && restore.variables === item.id; const deleting = permanentlyDelete.isPending && permanentlyDelete.variables === item.id; return <li key={item.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"><input aria-label={`Select ${item.displayName}`} type="checkbox" checked={selectedIds.includes(item.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id))} /><div className="min-w-0 flex-1"><p className="m-0 truncate font-medium text-foreground">{item.displayName}</p><p className="mt-1 text-sm text-muted-foreground">{item.entityKind} · {item.originalLocation} · Deleted {displayDate(item.trashedAt)}</p><p className="mt-1 text-xs text-muted-foreground">{timeRemaining(item.purgeAfterAt)} · purges {displayDate(item.purgeAfterAt)}</p></div><div className="flex shrink-0 gap-2"><Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => restore.mutate(item.id)}><RotateCcw /> {restoring ? 'Restoring…' : 'Restore'}</Button><Button type="button" variant="destructive" size="sm" disabled={pending} onClick={() => setDeleteIntent({ kind: 'one', item })}><Trash2 /> {deleting ? 'Deleting…' : 'Delete'}</Button></div></li> })}</ul></> : null}
      </CardContent>
    </Card>
    {deleteIntent ? <AlertDialog open onOpenChange={(open) => { if (!open && !pending) setDeleteIntent(null) }}><AlertDialogContent><AlertDialogTitle>Permanently delete item?</AlertDialogTitle><AlertDialogDescription>{deleteDescription}</AlertDialogDescription><AlertDialogFooter><AlertDialogCancelButton disabled={pending}>Cancel</AlertDialogCancelButton><AlertDialogActionButton disabled={pending} onClick={(event) => { event.preventDefault(); confirmDelete() }}>{pending ? 'Deleting…' : 'Delete permanently'}</AlertDialogActionButton></AlertDialogFooter></AlertDialogContent></AlertDialog> : null}
  </>
}
