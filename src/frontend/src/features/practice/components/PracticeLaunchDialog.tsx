import { ArrowRight, BookOpen, Copy, Headphones, Mic, X } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/shared/components/ui/dialog'
import type { PracticeDeck } from '../api/practice.api'

const steps = [
  { number: '01', title: 'Dictation', description: 'Listen & type', icon: Headphones },
  { number: '02', title: 'Word to meaning', description: 'Recall', icon: Copy },
  { number: '03', title: 'Pronunciation', description: 'Speak', icon: Mic },
] as const

type PracticeLaunchDialogProps = {
  deck: PracticeDeck | null
  isStarting: boolean
  startError: boolean
  onClose: () => void
  onStart: () => void
}

export function PracticeLaunchDialog({ deck, isStarting, startError, onClose, onStart }: PracticeLaunchDialogProps) {
  return (
    <Dialog open={Boolean(deck)} onOpenChange={(open) => { if (!open && !isStarting) onClose() }}>
      <DialogContent className="practice-launch-dialog" aria-describedby="practice-launch-description">
        <header className="practice-launch__header" data-node-id="92:237">
          <p className="practice-launch__eyebrow">PRACTICE SESSION</p>
          <DialogClose asChild>
            <button className="practice-launch__close" type="button" aria-label="Close practice dialog" disabled={isStarting}>
              <X size={16} aria-hidden="true" />
            </button>
          </DialogClose>
        </header>

        <div className="practice-launch__welcome" data-node-id="92:241">
          <DialogTitle className="practice-launch__title">A little practice. Lasting progress.</DialogTitle>
          <DialogDescription className="practice-launch__description" id="practice-launch-description">
            {deck ? `${deck.boardName}, ${deck.pageName}, ${deck.wordCount} ${deck.wordCount === 1 ? 'word' : 'words'}.` : ''}
          </DialogDescription>
        </div>

        <div className="practice-launch__deck" data-node-id="92:243" aria-label={deck ? `${deck.pageName}, ${deck.wordCount} ${deck.wordCount === 1 ? 'word' : 'words'}` : undefined}>
          <span className="practice-launch__deck-icon"><BookOpen size={26} strokeWidth={1.6} aria-hidden="true" /></span>
          <div className="practice-launch__deck-copy">
            <p className="practice-launch__board-name">{deck?.boardName ?? ''}</p>
            <p className="practice-launch__deck-name">{deck?.pageName ?? ''}</p>
            <p className="practice-launch__word-count">{deck ? `${deck.wordCount} ${deck.wordCount === 1 ? 'word' : 'words'}` : ''}</p>
          </div>
        </div>

        <section className="practice-launch__overview" aria-labelledby="practice-launch-overview-title" data-node-id="92:250">
          <h3 id="practice-launch-overview-title">IN THIS SESSION</h3>
          <div className="practice-launch__steps">
            {steps.map((step) => (
              <article className="practice-launch__step" key={step.number}>
                <step.icon className="practice-launch__step-icon" aria-hidden="true" strokeWidth={1.5} />
                <span className="practice-launch__step-number">{step.number}</span>
                <strong className="practice-launch__step-title">{step.title}</strong>
                <span className="practice-launch__step-description">{step.description}</span>
              </article>
            ))}
          </div>
        </section>

        {startError ? <p className="practice-launch__error" role="alert">Unable to start this practice session. Try again.</p> : null}

        <Button className="practice-launch__start" type="button" disabled={!deck || isStarting} onClick={onStart}>
          <span className="practice-launch__start-label">{isStarting ? 'Starting…' : 'Start practice'}</span>
          {!isStarting ? <ArrowRight className="practice-launch__start-arrow" size={18} aria-hidden="true" /> : null}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
