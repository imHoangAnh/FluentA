import { CloudRain, Feather, Moon, Sparkles, Sun, Zap } from 'lucide-react'
import type { JournalEntrySummary, JournalMoodId } from '../api/journal.api'

export type JournalMoodMeta = {
  id: JournalMoodId
  label: string
  fg: string
  bg: string
  dot: string
  icon: typeof Feather
}

export const JOURNAL_MOODS: ReadonlyArray<JournalMoodMeta> = [
  {
    id: 'peaceful',
    label: 'Peaceful',
    fg: '#0f766e',
    bg: '#e3f3f1',
    dot: '#0f766e',
    icon: Feather,
  },
  {
    id: 'grateful',
    label: 'Grateful',
    fg: '#9a5b13',
    bg: '#fdefd8',
    dot: '#d97706',
    icon: Sun,
  },
  {
    id: 'energized',
    label: 'Energized',
    fg: '#a16207',
    bg: '#fef3c7',
    dot: '#eab308',
    icon: Zap,
  },
  {
    id: 'reflective',
    label: 'Reflective',
    fg: '#3b4cca',
    bg: '#e5e8fa',
    dot: '#4f46e5',
    icon: Moon,
  },
  {
    id: 'tired',
    label: 'Tired',
    fg: '#475569',
    bg: '#edf2f7',
    dot: '#64748b',
    icon: CloudRain,
  },
  {
    id: 'stressed',
    label: 'Stressed',
    fg: '#b91c1c',
    bg: '#fee2e2',
    dot: '#dc2626',
    icon: Sparkles,
  },
]

const MOOD_LOOKUP = new Map<string, JournalMoodMeta>(JOURNAL_MOODS.map((mood) => [mood.id, mood]))

export function getJournalMoodMeta(mood: string | null | undefined): JournalMoodMeta | null {
  if (!mood) return null
  return MOOD_LOOKUP.get(mood.toLowerCase()) ?? null
}

export type DailyQuoteItem = {
  quote: string
  author: string
}

export const FALLBACK_DAILY_QUOTES: ReadonlyArray<DailyQuoteItem> = [
  {
    quote: 'What quiet moment today deserves to be remembered a year from now?',
    author: 'FluentA Reflection',
  },
  {
    quote: 'A room without books is like a body without a soul.',
    author: 'Marcus Tullius Cicero',
  },
  {
    quote: 'Be yourself; everyone else is already taken.',
    author: 'Oscar Wilde',
  },
]

let cachedQuotes: ReadonlyArray<DailyQuoteItem> | null = null

export async function loadJournalQuotes(): Promise<ReadonlyArray<DailyQuoteItem>> {
  if (cachedQuotes) return cachedQuotes
  const module = await import('../data/quotes.json')
  const loaded = (module.default ?? []) as DailyQuoteItem[]
  cachedQuotes = loaded.length > 0 ? loaded : FALLBACK_DAILY_QUOTES
  return cachedQuotes
}

export function pickDailyQuote(
  quotes: ReadonlyArray<DailyQuoteItem>,
  dateInput: string,
  offset = 0,
): DailyQuoteItem {
  const pool = quotes.length > 0 ? quotes : FALLBACK_DAILY_QUOTES
  let hash = 0
  for (let i = 0; i < dateInput.length; i++) {
    hash = (hash * 31 + dateInput.charCodeAt(i)) >>> 0
  }
  const index = (hash + Math.max(0, offset)) % pool.length
  return pool[index]
}

export function toDateInput(date: Date): string {
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`
}

export function toMonthInput(date: Date): string {
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}`
}

export function computeJournalStreak(entries: ReadonlyArray<Pick<JournalEntrySummary, 'date'>>, referenceDate = new Date()): number {
  const dates = new Set(entries.map((entry) => entry.date))
  if (dates.size === 0) return 0

  const cursor = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate())
  const todayStr = toDateInput(cursor)
  if (!dates.has(todayStr)) {
    cursor.setDate(cursor.getDate() - 1)
  }

  let streak = 0
  while (dates.has(toDateInput(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export type StreakDay = {
  dateStr: string
  letter: string
  isToday: boolean
  isSelected: boolean
  mood: JournalMoodId | null
  hasEntry: boolean
}

const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const

export function buildLastSevenDays(
  entries: ReadonlyArray<Pick<JournalEntrySummary, 'date' | 'mood'>>,
  selectedDateStr: string,
  referenceDate = new Date(),
): StreakDay[] {
  const byDate = new Map<string, JournalMoodId | null>()
  for (const entry of entries) {
    if (!byDate.has(entry.date)) {
      byDate.set(entry.date, entry.mood ?? null)
    }
  }

  const todayStr = toDateInput(referenceDate)
  const days: StreakDay[] = []
  for (let delta = -6; delta <= 0; delta++) {
    const day = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate() + delta)
    const dateStr = toDateInput(day)
    days.push({
      dateStr,
      letter: WEEKDAY_LETTERS[day.getDay()],
      isToday: dateStr === todayStr,
      isSelected: dateStr === selectedDateStr,
      mood: byDate.get(dateStr) ?? null,
      hasEntry: byDate.has(dateStr),
    })
  }
  return days
}

export function isVocabUsedInEntry(word: string, title: string, html: string): boolean {
  const cleanedWord = word.trim()
  if (!cleanedWord) return false
  const plainBody = html.replace(/<[^>]*>/g, ' ')
  const combined = `${title} ${plainBody}`
  const escaped = cleanedWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}([^\\p{L}\\p{N}]|$)`, 'iu').test(combined)
}
