import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { FlashcardPage, PracticeMode } from '@/lib/api/flashcard.api'
import * as flashcardApi from '@/lib/api/flashcard.api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog'

type PracticeOrder = 'sequential' | 'shuffle'

const modeLabels: Record<PracticeMode, string> = {
  dictation: 'Dictation',
  meaningToWord: 'Meaning → Word',
  pronunciation: 'Pronunciation',
}

export function PracticeLaunchDialog({ page, onClose, onStart }: { page: FlashcardPage | null; onClose: () => void; onStart: (pageId: string, order: PracticeOrder) => void }) {
  const [order, setOrder] = useState<PracticeOrder>('sequential')
  const settingsQuery = useQuery({ queryKey: ['practice', 'settings'], queryFn: flashcardApi.getPracticeSettings, enabled: Boolean(page) })

  return (
    <Dialog open={Boolean(page)} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent aria-describedby="practice-launch-description">
        <div className="grid gap-1">
          <DialogTitle>Start practice</DialogTitle>
          <DialogDescription id="practice-launch-description">{page ? `${page.pageName} · ${page.words.length} ${page.words.length === 1 ? 'word' : 'words'}` : ''}</DialogDescription>
        </div>

        <div className="grid gap-2">
          <span className="text-sm font-medium text-foreground">Order</span>
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Practice order">
            <Button type="button" variant={order === 'sequential' ? 'default' : 'outline'} onClick={() => setOrder('sequential')}>Sequential</Button>
            <Button type="button" variant={order === 'shuffle' ? 'default' : 'outline'} onClick={() => setOrder('shuffle')}>Shuffle</Button>
          </div>
        </div>

        <div className="grid gap-2">
          <span className="text-sm font-medium text-foreground">Configured modes</span>
          {settingsQuery.isLoading ? <p role="status" className="m-0 text-sm text-muted-foreground">Loading practice modes...</p> : null}
          {settingsQuery.isError ? <p role="alert" className="m-0 text-sm text-destructive">Unable to load practice modes. Try again when your connection is available.</p> : null}
          {settingsQuery.isSuccess ? <div className="flex flex-wrap gap-2">{settingsQuery.data.modeSequence.map((mode) => <Badge key={mode} variant="outline">{modeLabels[mode]}</Badge>)}</div> : null}
        </div>

        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
          <Button type="button" disabled={!page || !settingsQuery.isSuccess} onClick={() => { if (page) onStart(page.pageId, order) }}>Start practice</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
