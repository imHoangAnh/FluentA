import {
  CalendarClock,
  Dumbbell,
  FolderKanban,
  LibraryBig,
  ListChecks,
  NotebookPen,
  Repeat2,
  RotateCcw,
  StickyNote,
} from 'lucide-react'
import { createElement } from 'react'
import { ReviewSetup } from '@/features/review'
import type { ShellNavigationSection } from '@/shared/components/layout/ShellEnvironment'

const practiceRoute = (pathname: string) => pathname === '/practice'
  || /^\/practice\/[^/]+$/.test(pathname)

export const shellNavigationSections: ShellNavigationSection[] = [
  {
    label: 'Learning',
    items: [
      {
        to: '/vocabulary',
        label: 'Vocabulary',
        icon: LibraryBig,
      },
      {
        to: '/practice',
        label: 'Practice',
        icon: Dumbbell,
        isActive: practiceRoute,
      },
      {
        to: '/review',
        label: 'Review',
        icon: RotateCcw,
        dialogQueryParam: 'review',
        renderDialog: (open, onOpenChange) => createElement(ReviewSetup, { open, onOpenChange }),
      },
    ],
  },
  {
    label: 'Productivity',
    items: [
      {
        to: '/todo',
        label: 'Todo',
        icon: ListChecks,
      },
      {
        to: '/habits',
        label: 'Habits',
        icon: Repeat2,
      },
      {
        to: '/countdowns',
        label: 'Countdowns',
        icon: CalendarClock,
      },
      {
        to: '/project',
        label: 'Projects',
        icon: FolderKanban,
      },
    ],
  },
  {
    label: 'Personal',
    items: [
      {
        to: '/journal',
        label: 'Journal',
        icon: NotebookPen,
      },
      {
        to: '/notes',
        label: 'Notes',
        icon: StickyNote,
      },
    ],
  },
]
