import { Check, RefreshCw, Shuffle } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { JournalVocabSuggestion } from '../api/journal.api'
import { isVocabUsedInEntry, type DailyQuoteItem } from './journal-moods'

type JournalCompanionRailProps = {
  dailyQuote: DailyQuoteItem
  canInsert: boolean
  hasActiveEntry?: boolean
  vocabItems: ReadonlyArray<JournalVocabSuggestion>
  vocabLoading: boolean
  vocabError: boolean
  activeTitle: string
  activeContent: string
  onCyclePrompt: () => void
  onInsertPrompt: (prompt: string) => void
  onShuffleVocab: () => void
  onInsertVocab: (word: string) => void
}

export function JournalCompanionRail(props: JournalCompanionRailProps) {
  const {
    dailyQuote,
    canInsert,
    hasActiveEntry = canInsert,
    vocabItems,
    vocabLoading,
    vocabError,
    activeTitle,
    activeContent,
    onCyclePrompt,
    onInsertPrompt,
    onShuffleVocab,
    onInsertVocab,
  } = props

  const quoteToInsert = dailyQuote.author
    ? `“${dailyQuote.quote}” — ${dailyQuote.author}`
    : `“${dailyQuote.quote}”`

  return (
    <aside className="journal-companion-rail" aria-label="Writing companion">
      <section className="journal-companion-card" aria-label="Daily quote prompt">
        <div className="journal-companion-header">
          <span className="journal-companion-eyebrow">DAILY QUOTE</span>
          <button
            type="button"
            className="journal-companion-icon-btn"
            aria-label="Next daily quote"
            onClick={onCyclePrompt}
            title="Next daily quote"
          >
            <RefreshCw size={13} aria-hidden="true" />
          </button>
        </div>
        <button
          type="button"
          className="journal-daily-quote-box"
          onClick={() => onInsertPrompt(quoteToInsert)}
          disabled={!canInsert}
          title={canInsert ? 'Insert quote as Reflection Quote' : 'Only today’s journal can be edited'}
        >
          <span className="journal-daily-quote-text" data-testid="journal-daily-quote-text">
            “{dailyQuote.quote}”
          </span>
          {dailyQuote.author && (
            <span className="journal-daily-quote-author" data-testid="journal-daily-quote-author">
              {dailyQuote.author}
            </span>
          )}
        </button>
      </section>

      <section className="journal-companion-card" aria-label="Random vocabulary suggestions">
        <div className="journal-companion-header">
          <span className="journal-companion-eyebrow">RANDOM VOCAB</span>
          <button
            type="button"
            className="journal-companion-icon-btn"
            aria-label="Shuffle vocabulary suggestions"
            onClick={onShuffleVocab}
            title="Shuffle vocabulary"
          >
            <Shuffle size={13} aria-hidden="true" />
          </button>
        </div>

        {vocabLoading ? (
          <p className="journal-companion-empty">Loading vocabulary…</p>
        ) : vocabError ? (
          <p className="journal-companion-empty">Could not load vocabulary.</p>
        ) : vocabItems.length === 0 ? (
          <p className="journal-companion-empty">
            Add words in Vocabulary to see writing prompts here.
          </p>
        ) : (
          <div className="journal-vocab-chips" data-testid="journal-vocab-chips">
            {vocabItems.map((item) => {
              const used = hasActiveEntry && isVocabUsedInEntry(item.word, activeTitle, activeContent)
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={!canInsert}
                  data-used={used ? 'true' : 'false'}
                  title={item.meaning ? `${item.word} — ${item.meaning}` : item.word}
                  className={cn('journal-vocab-chip', used && 'journal-vocab-chip--used')}
                  onClick={() => onInsertVocab(item.word)}
                >
                  {used && <Check size={12} aria-hidden="true" />}
                  <span>{item.word}</span>
                </button>
              )
            })}
          </div>
        )}
      </section>
    </aside>
  )
}
